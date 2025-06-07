import { z } from 'zod';
import { Task } from '../../models/task.js';
import { Storage } from '../../storage/storage.js';

/**
 * Recommend the next task to work on based on dependencies, priorities, and current status
 * This tool implements intelligent task recommendation for optimal workflow management
 */
export function createNextTaskRecommendationTool(storage: Storage, getWorkingDirectoryDescription: (config: any) => string, config: any) {
  return {
    name: 'get_next_task_recommendation',
    description: 'Get intelligent recommendations for the next task to work on based on dependencies, priorities, complexity, and current project status. Smart task recommendation engine for optimal workflow management.',
    inputSchema: z.object({
      workingDirectory: z.string().describe(getWorkingDirectoryDescription(config)),
      projectId: z.string().optional().describe('Filter recommendations to a specific project'),
      maxRecommendations: z.number().min(1).max(10).optional().default(3).describe('Maximum number of task recommendations to return'),
      considerComplexity: z.boolean().optional().default(true).describe('Whether to factor in task complexity for recommendations'),
      preferredTags: z.array(z.string()).optional().describe('Preferred task tags to prioritize in recommendations'),
      excludeBlocked: z.boolean().optional().default(true).describe('Whether to exclude blocked tasks from recommendations')
    }),
    handler: async (args: any) => {
      try {
        const {
          workingDirectory,
          projectId,
          maxRecommendations,
          considerComplexity,
          preferredTags,
          excludeBlocked
        } = args;

        // Get all tasks, optionally filtered by project
        const allTasks = projectId
          ? await storage.getTasks(projectId)
          : await getAllTasksAcrossProjects(storage);

        if (allTasks.length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: projectId
                ? `No tasks found in the specified project.`
                : `No tasks found. Create some tasks first using \`create_task\` or \`parse_prd\`.`
            }]
          };
        }

        // Filter and analyze tasks
        const readyTasks = await findReadyTasks(allTasks, excludeBlocked);

        if (readyTasks.length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: `🚫 No tasks are currently ready to work on. All tasks are either completed, blocked, or waiting for dependencies.

📊 **Task Status Summary:**
${generateTaskStatusSummary(allTasks)}

💡 **Suggestions:**
1. Check if any blocked tasks can be unblocked
2. Review task dependencies for circular references
3. Create new tasks if all current tasks are completed`
            }]
          };
        }

        // Score and rank tasks
        const scoredTasks = await scoreAndRankTasks(
          readyTasks,
          allTasks,
          considerComplexity,
          preferredTags
        );

        // Get top recommendations
        const recommendations = scoredTasks.slice(0, maxRecommendations);

        // Generate recommendation report
        const report = generateRecommendationReport(recommendations, allTasks);

        return {
          content: [{
            type: 'text' as const,
            text: report
          }],
          recommendedNextStep: 'research_task'
        };

      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error generating task recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  };
}

/**
 * Get all tasks across all projects
 */
async function getAllTasksAcrossProjects(storage: Storage): Promise<Task[]> {
  const projects = await storage.getProjects();
  const allTasks: Task[] = [];

  for (const project of projects) {
    const projectTasks = await storage.getTasks(project.id);
    allTasks.push(...projectTasks);
  }

  return allTasks;
}

/**
 * Find tasks that are ready to work on (no blocking dependencies)
 */
async function findReadyTasks(allTasks: Task[], excludeBlocked: boolean): Promise<Task[]> {
  const readyTasks: Task[] = [];

  for (const task of allTasks) {
    // Skip completed tasks
    if (task.completed || task.status === 'done') {
      continue;
    }

    // Skip blocked tasks if requested
    if (excludeBlocked && task.status === 'blocked') {
      continue;
    }

    // Check if all dependencies are completed
    if (task.dependsOn && task.dependsOn.length > 0) {
      const dependenciesMet = task.dependsOn.every(depId => {
        const depTask = allTasks.find(t => t.id === depId);
        return depTask && (depTask.completed || depTask.status === 'done');
      });

      if (!dependenciesMet) {
        continue;
      }
    }

    readyTasks.push(task);
  }

  return readyTasks;
}

/**
 * Score and rank tasks based on multiple criteria
 */
async function scoreAndRankTasks(
  readyTasks: Task[],
  allTasks: Task[],
  considerComplexity: boolean,
  preferredTags?: string[]
): Promise<Array<Task & { score: number; reasoning: string }>> {

  const scoredTasks = readyTasks.map(task => {
    let score = 0;
    const reasoningParts: string[] = [];

    // Priority score (40% weight)
    const priorityScore = (task.priority || 5) * 4;
    score += priorityScore;
    reasoningParts.push(`Priority: ${task.priority || 5}/10 (+${priorityScore})`);

    // Complexity consideration (20% weight)
    if (considerComplexity && task.complexity) {
      // Lower complexity gets higher score for "quick wins"
      const complexityScore = (11 - task.complexity) * 2;
      score += complexityScore;
      reasoningParts.push(`Complexity: ${task.complexity}/10 (+${complexityScore} for lower complexity)`);
    }

    // Tag preference bonus (15% weight)
    if (preferredTags && preferredTags.length > 0 && task.tags) {
      const tagMatches = task.tags.filter(tag => preferredTags.includes(tag)).length;
      const tagScore = tagMatches * 5;
      score += tagScore;
      if (tagScore > 0) {
        reasoningParts.push(`Tag matches: ${tagMatches} (+${tagScore})`);
      }
    }

    // Status bonus (10% weight)
    if (task.status === 'in-progress') {
      score += 10;
      reasoningParts.push(`In progress (+10)`);
    }

    // Dependency enabler bonus (15% weight)
    const dependentTasks = allTasks.filter(t =>
      t.dependsOn && t.dependsOn.includes(task.id) && !t.completed && t.status !== 'done'
    );
    if (dependentTasks.length > 0) {
      const enablerScore = dependentTasks.length * 3;
      score += enablerScore;
      reasoningParts.push(`Enables ${dependentTasks.length} other tasks (+${enablerScore})`);
    }

    return {
      ...task,
      score,
      reasoning: reasoningParts.join(', ')
    };
  });

  // Sort by score (highest first)
  return scoredTasks.sort((a, b) => b.score - a.score);
}

/**
 * Generate a comprehensive recommendation report
 */
function generateRecommendationReport(
  recommendations: Array<Task & { score: number; reasoning: string }>,
  allTasks: Task[]
): string {
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(t => t.completed || t.status === 'done').length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  let report = `🎯 **Next Task Recommendations**

📊 **Project Progress:** ${completedTasks}/${totalTasks} tasks completed (${progressPercentage}%)

🏆 **Top Recommendations:**

`;

  recommendations.forEach((task, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
    report += `${medal} **${task.name}** (Score: ${Math.round(task.score)})
   📝 ${task.details.substring(0, 100)}${task.details.length > 100 ? '...' : ''}
   🎯 Priority: ${task.priority || 5}/10
   🧩 Complexity: ${task.complexity || 'N/A'}/10
   ⏱️ Estimated: ${task.estimatedHours || 'N/A'} hours
   🏷️ Tags: ${task.tags?.join(', ') || 'None'}
   🔗 Dependencies: ${task.dependsOn?.length ? `${task.dependsOn.length} completed` : 'None'}
   💡 Reasoning: ${task.reasoning}

`;
  });

  report += `💡 **Getting Started:**
1. Use \`update_task\` to mark the chosen task as 'in-progress'
2. Break down complex tasks into subtasks if needed
3. Update progress regularly and mark as 'done' when completed
4. Run this recommendation again to get your next task

🔄 **Pro Tip:** Update task statuses regularly to get better recommendations!`;

  return report;
}

/**
 * Generate a summary of task statuses
 */
function generateTaskStatusSummary(allTasks: Task[]): string {
  const statusCounts = {
    pending: 0,
    'in-progress': 0,
    blocked: 0,
    done: 0,
    completed: 0
  };

  allTasks.forEach(task => {
    if (task.completed || task.status === 'done') {
      statusCounts.completed++;
    } else if (task.status) {
      statusCounts[task.status]++;
    } else {
      statusCounts.pending++;
    }
  });

  return `• Completed: ${statusCounts.completed + statusCounts.done}
• In Progress: ${statusCounts['in-progress']}
• Pending: ${statusCounts.pending}
• Blocked: ${statusCounts.blocked}`;
}
