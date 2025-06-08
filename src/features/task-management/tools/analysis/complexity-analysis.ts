import { z } from 'zod';
import { Task, CreateTaskInput } from '../../models/task.js';
import { Storage } from '../../storage/storage.js';

/**
 * Analyze task complexity and suggest task breakdown for overly complex tasks
 * This tool implements intelligent complexity analysis and task splitting suggestions
 */
export function createComplexityAnalysisTool(storage: Storage, getWorkingDirectoryDescription: (config: any) => string, config: any) {
  return {
    name: 'analyze_task_complexity',
    description: 'Analyze task complexity and suggest breaking down overly complex tasks into smaller, manageable subtasks. Intelligent complexity analysis feature for better productivity and progress tracking.',
    inputSchema: z.object({
      workingDirectory: z.string().describe(getWorkingDirectoryDescription(config)),
      taskId: z.string().optional().describe('Specific task ID to analyze (if not provided, analyzes all tasks)'),
      projectId: z.string().optional().describe('Filter analysis to a specific project'),
      complexityThreshold: z.number().min(1).max(10).optional().default(7).describe('Complexity threshold above which tasks should be broken down'),
      suggestBreakdown: z.boolean().optional().default(true).describe('Whether to suggest specific task breakdowns'),
      autoCreateSubtasks: z.boolean().optional().default(false).describe('Whether to automatically create suggested subtasks')
    }),
    handler: async (args: any) => {
      try {
        const {
          workingDirectory,
          taskId,
          projectId,
          complexityThreshold,
          suggestBreakdown,
          autoCreateSubtasks
        } = args;

        let tasksToAnalyze: Task[] = [];

        if (taskId) {
          // Analyze specific task
          const task = await storage.getTask(taskId);
          if (!task) {
            return {
              content: [{
                type: 'text' as const,
                text: `Error: Task with ID "${taskId}" not found.`
              }],
              isError: true
            };
          }
          tasksToAnalyze = [task];
        } else if (projectId) {
          // Analyze all tasks in project
          tasksToAnalyze = await storage.getTasks(projectId);
        } else {
          // Analyze all tasks across all projects
          const projects = await storage.getProjects();
          for (const project of projects) {
            const projectTasks = await storage.getTasks(project.id);
            tasksToAnalyze.push(...projectTasks);
          }
        }

        if (tasksToAnalyze.length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: `No tasks found for analysis.`
            }]
          };
        }

        // Analyze tasks
        const analysisResults = await analyzeTaskComplexity(
          tasksToAnalyze,
          complexityThreshold,
          suggestBreakdown
        );

        // Auto-create subtasks if requested
        if (autoCreateSubtasks && analysisResults.complexTasks.length > 0) {
          await autoCreateSubtasksFromSuggestions(storage, analysisResults.complexTasks);
        }

        // Generate analysis report
        const report = generateComplexityAnalysisReport(
          analysisResults,
          complexityThreshold,
          autoCreateSubtasks
        );

        return {
          content: [{
            type: 'text' as const,
            text: report
          }]
        };

      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error analyzing task complexity: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  };
}

interface ComplexityAnalysisResult {
  complexTasks: Array<Task & {
    analysisScore: number;
    issues: string[];
    suggestions: CreateTaskInput[]
  }>;
  simpleTasksCount: number;
  totalTasksAnalyzed: number;
  averageComplexity: number;
}

/**
 * Analyze task complexity and identify overly complex tasks
 */
async function analyzeTaskComplexity(
  tasks: Task[],
  threshold: number,
  suggestBreakdown: boolean
): Promise<ComplexityAnalysisResult> {

  const complexTasks: Array<Task & {
    analysisScore: number;
    issues: string[];
    suggestions: CreateTaskInput[]
  }> = [];

  let totalComplexity = 0;
  let tasksWithComplexity = 0;

  for (const task of tasks) {
    // Skip completed tasks
    if (task.completed || task.status === 'done') {
      continue;
    }

    // Calculate analysis score
    const analysisResult = calculateComplexityScore(task);
    totalComplexity += analysisResult.score;
    tasksWithComplexity++;

    // Check if task exceeds threshold
    if (analysisResult.score >= threshold) {
      const suggestions = suggestBreakdown
        ? generateTaskBreakdownSuggestions(task)
        : [];

      complexTasks.push({
        ...task,
        analysisScore: analysisResult.score,
        issues: analysisResult.issues,
        suggestions
      });
    }
  }

  return {
    complexTasks,
    simpleTasksCount: tasksWithComplexity - complexTasks.length,
    totalTasksAnalyzed: tasksWithComplexity,
    averageComplexity: tasksWithComplexity > 0 ? totalComplexity / tasksWithComplexity : 0
  };
}

/**
 * Calculate complexity score for a task
 */
function calculateComplexityScore(task: Task): { score: number; issues: string[] } {
  let score = task.complexity || 5; // Start with existing complexity or default
  const issues: string[] = [];

  // Analyze task name length and complexity indicators
  if (task.name.length > 50) {
    score += 1;
    issues.push('Task name is very long, suggesting multiple concerns');
  }

  // Analyze task details for complexity indicators
  const details = task.details.toLowerCase();

  // High complexity keywords
  const highComplexityKeywords = [
    'architecture', 'system', 'integration', 'security', 'performance',
    'scalability', 'database', 'api', 'framework', 'refactor', 'migration'
  ];

  const highComplexityMatches = highComplexityKeywords.filter(keyword =>
    details.includes(keyword)
  ).length;

  if (highComplexityMatches > 2) {
    score += 2;
    issues.push(`Contains ${highComplexityMatches} high-complexity keywords`);
  }

  // Multiple action verbs suggest multiple tasks
  const actionVerbs = [
    'implement', 'create', 'build', 'develop', 'design', 'setup',
    'configure', 'test', 'deploy', 'document', 'research'
  ];

  const actionMatches = actionVerbs.filter(verb =>
    details.includes(verb)
  ).length;

  if (actionMatches > 3) {
    score += 1;
    issues.push(`Contains ${actionMatches} different action verbs, suggesting multiple tasks`);
  }

  // Long details suggest complexity
  if (task.details.length > 500) {
    score += 1;
    issues.push('Task description is very detailed, suggesting high complexity');
  }

  // High estimated hours
  if (task.estimatedHours && task.estimatedHours > 20) {
    score += 1;
    issues.push(`High time estimate (${task.estimatedHours} hours) suggests complexity`);
  }

  // Multiple dependencies can indicate complexity
  if (task.dependsOn && task.dependsOn.length > 3) {
    score += 1;
    issues.push(`Many dependencies (${task.dependsOn.length}) suggest complex coordination`);
  }

  return {
    score: Math.min(10, score), // Cap at 10
    issues
  };
}

/**
 * Generate task breakdown suggestions
 */
function generateTaskBreakdownSuggestions(task: Task): CreateTaskInput[] {
  const suggestions: CreateTaskInput[] = [];
  const details = task.details.toLowerCase();

  // Common breakdown patterns
  const breakdownPatterns = [
    {
      keywords: ['research', 'investigate', 'analyze'],
      suggestion: {
        name: `Research and Analysis for ${task.name}`,
        details: `Research requirements, analyze existing solutions, and document findings for: ${task.details.substring(0, 200)}`,
        tags: ['research', 'analysis']
      }
    },
    {
      keywords: ['design', 'architecture', 'plan'],
      suggestion: {
        name: `Design and Planning for ${task.name}`,
        details: `Create detailed design and implementation plan for: ${task.details.substring(0, 200)}`,
        tags: ['design', 'planning']
      }
    },
    {
      keywords: ['implement', 'develop', 'build', 'code'],
      suggestion: {
        name: `Core Implementation for ${task.name}`,
        details: `Implement the main functionality for: ${task.details.substring(0, 200)}`,
        tags: ['implementation', 'development']
      }
    },
    {
      keywords: ['test', 'testing', 'validation'],
      suggestion: {
        name: `Testing and Validation for ${task.name}`,
        details: `Create and execute tests to validate: ${task.details.substring(0, 200)}`,
        tags: ['testing', 'validation']
      }
    },
    {
      keywords: ['document', 'documentation', 'guide'],
      suggestion: {
        name: `Documentation for ${task.name}`,
        details: `Create comprehensive documentation for: ${task.details.substring(0, 200)}`,
        tags: ['documentation']
      }
    }
  ];

  // Generate suggestions based on content
  for (const pattern of breakdownPatterns) {
    if (pattern.keywords.some(keyword => details.includes(keyword))) {
      suggestions.push({
        name: pattern.suggestion.name,
        details: pattern.suggestion.details,
        projectId: task.projectId,
        priority: task.priority,
        complexity: Math.max(1, (task.complexity || 5) - 2),
        tags: pattern.suggestion.tags,
        estimatedHours: Math.round((task.estimatedHours || 8) / 3)
      });
    }
  }

  // If no specific patterns found, create generic breakdown
  if (suggestions.length === 0) {
    const baseHours = (task.estimatedHours || 16) / 3;
    suggestions.push(
      {
        name: `Planning Phase: ${task.name}`,
        details: `Plan and design approach for: ${task.details.substring(0, 200)}`,
        projectId: task.projectId,
        priority: task.priority,
        complexity: Math.max(1, (task.complexity || 5) - 3),
        tags: ['planning'],
        estimatedHours: Math.round(baseHours)
      },
      {
        name: `Implementation Phase: ${task.name}`,
        details: `Implement core functionality for: ${task.details.substring(0, 200)}`,
        projectId: task.projectId,
        priority: task.priority,
        complexity: Math.max(1, (task.complexity || 5) - 2),
        tags: ['implementation'],
        estimatedHours: Math.round(baseHours * 2)
      },
      {
        name: `Testing Phase: ${task.name}`,
        details: `Test and validate implementation for: ${task.details.substring(0, 200)}`,
        projectId: task.projectId,
        priority: task.priority,
        complexity: Math.max(1, (task.complexity || 5) - 3),
        tags: ['testing'],
        estimatedHours: Math.round(baseHours)
      }
    );
  }

  return suggestions;
}

/**
 * Auto-create subtasks from suggestions
 */
async function autoCreateSubtasksFromSuggestions(
  storage: Storage,
  complexTasks: Array<Task & { suggestions: CreateTaskInput[] }>
): Promise<void> {
  for (const task of complexTasks) {
    for (const suggestion of task.suggestions) {
      // Create as subtask
      await storage.createSubtask({
        id: '', // Will be generated
        name: suggestion.name,
        details: suggestion.details,
        taskId: task.id,
        projectId: task.projectId,
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  }
}

/**
 * Generate complexity analysis report
 */
function generateComplexityAnalysisReport(
  results: ComplexityAnalysisResult,
  threshold: number,
  autoCreated: boolean
): string {
  let report = `🔍 **Task Complexity Analysis Report**

📊 **Summary:**
• Total tasks analyzed: ${results.totalTasksAnalyzed}
• Complex tasks (≥${threshold}): ${results.complexTasks.length}
• Simple tasks (<${threshold}): ${results.simpleTasksCount}
• Average complexity: ${results.averageComplexity.toFixed(1)}/10

`;

  if (results.complexTasks.length === 0) {
    report += `✅ **Great news!** All tasks are within the complexity threshold. Your tasks are well-scoped and manageable.`;
    return report;
  }

  report += `⚠️ **Complex Tasks Requiring Attention:**

`;

  results.complexTasks.forEach((task, index) => {
    report += `${index + 1}. **${task.name}** (Complexity: ${task.analysisScore}/10)
   📝 ${task.details.substring(0, 100)}${task.details.length > 100 ? '...' : ''}
   ⚠️ Issues: ${task.issues.join(', ')}

   💡 **Suggested Breakdown:**
${task.suggestions.map(s => `   • ${s.name} (Est: ${s.estimatedHours}h)`).join('\n')}

`;
  });

  if (autoCreated) {
    report += `✅ **Auto-created subtasks** for all complex tasks. Check your subtasks to see the breakdown.

`;
  }

  if (results.complexTasks.length > 0) {
    let new_guidance = "\n👉 **Your Actions: Address Complex Tasks & Proceed**\n\n";
    if (!autoCreated) { // autoCreated is the autoCreateSubtasks boolean
        new_guidance += "1.  **Break Down Complex Tasks:** For each complex task listed above, review the \"Suggested Breakdown.\" " +
                       "You can create these as subtasks using the \`create_subtask\` tool or simplify the main task using \`update_task\`.\n" +
                       "    *   Example for \`create_subtask\`: \`create_subtask({ taskId: \"task_id_from_above\", name: \"suggested_subtask_name\", details: \"...\" })\`\n" +
                       "    *   Example for \`update_task\`: \`update_task({ id: \"task_id_from_above\", details: \"simplified_details\", complexity: new_lower_complexity })\`\n\n";
    } else {
        new_guidance += "1.  **Review Auto-Created Subtasks:** Subtasks have been automatically created based on the suggestions. " +
                       "Review them using \`list_subtasks\` and refine them if necessary using \`update_subtask\`.\n" +
                       "    *   Example: \`list_subtasks({ taskId: \"task_id_from_above\" })\`\n\n";
    }

    new_guidance += "2.  **Re-analyze (Optional):** After addressing the complexities, you can re-run this analysis for a specific task to confirm its new complexity score.\n" +
                   "    *   Example: \`analyze_task_complexity({ taskId: \"task_id_from_above\" })\`\n\n";
    new_guidance += "3.  **Determine Next Task:** Once tasks are appropriately scoped, use the \`get_next_task_recommendation\` tool to decide what to work on next.\n" +
                   "    *   Example: \`get_next_task_recommendation({ projectId: \"project_id_if_known_or_relevant\" })\`\n\n";
    new_guidance += "💡 **Pro Tip:** Well-scoped tasks lead to better progress tracking and less overwhelming work sessions!";
    report += new_guidance;
  } else {
    // This part of the original logic was:
    // if (results.complexTasks.length === 0) {
    //   report += `✅ **Great news!** All tasks are within the complexity threshold. Your tasks are well-scoped and manageable.`;
    //   return report; // Original logic returned early
    // }
    // The new logic requires this to be an else block.
    // The initial part of the "Great news!" message is already added before the `⚠️ Complex Tasks Requiring Attention:` block if complexTasks.length === 0.
    // So we only need to add the new actionable part.
    report += "\n\n👉 **Your Next Step:** You can proceed to determine your next task using \`get_next_task_recommendation\`.\n" +
              "    *   Example: \`get_next_task_recommendation({ projectId: \"project_id_if_known_or_relevant\" })\`";
  }

  return report;
}
