import { z } from 'zod';
import { randomUUID } from 'crypto';
import { Task, CreateTaskInput } from '../../models/task.js';
import { Project } from '../../models/project.js';
import { Storage } from '../../storage/storage.js';

/**
 * Parse a Product Requirements Document (PRD) and generate structured tasks
 * This tool analyzes PRD content and creates a hierarchical task breakdown with intelligent analysis
 */
export function createParsePRDTool(storage: Storage, getWorkingDirectoryDescription: (config: any) => string, config: any) {
  return {
    name: 'parse_prd',
    description: 'Parse a Product Requirements Document (PRD) and automatically generate structured tasks with dependencies, priorities, and complexity estimates. This tool analyzes PRD content and creates a comprehensive task breakdown with intelligent analysis.',
    inputSchema: z.object({
      workingDirectory: z.string().describe(getWorkingDirectoryDescription(config)),
      projectId: z.string().describe('ID of the project to add tasks to'),
      prdContent: z.string().describe('Content of the Product Requirements Document to parse'),
      generateSubtasks: z.boolean().optional().default(true).describe('Whether to generate subtasks for complex tasks'),
      defaultPriority: z.number().min(1).max(10).optional().default(5).describe('Default priority for generated tasks (1-10)'),
      estimateComplexity: z.boolean().optional().default(true).describe('Whether to estimate complexity for tasks')
    }),
    handler: async (args: any) => {
      try {
        const { workingDirectory, projectId, prdContent, generateSubtasks, defaultPriority, estimateComplexity } = args;

        // Validate project exists
        const project = await storage.getProject(projectId);
        if (!project) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: Project with ID "${projectId}" not found.`
            }],
            isError: true
          };
        }

        // Check if the project already has tasks to determine if the PRD was processed before
        const existingTasks = await storage.getTasks(projectId);
        const processed = existingTasks.length > 0;

        if (processed) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `ℹ️ Project "${project.name}" already has ${existingTasks.length} tasks. PRD has been processed previously.`
              }
            ],
            processed: true,
            recommendedNextStep: 'get_next_task_recommendation'
          };
        }

        // Parse PRD content and extract tasks
        const parsedTasks = await parsePRDContent(prdContent, projectId, defaultPriority, estimateComplexity);

        // Create tasks in storage
        const createdTasks: Task[] = [];
        const taskDependencyMap = new Map<string, string[]>();

        for (const taskData of parsedTasks) {
          const now = new Date().toISOString();
          const task: Task = {
            id: randomUUID(),
            name: taskData.name,
            details: taskData.details,
            projectId,
            completed: false,
            createdAt: now,
            updatedAt: now,
            dependsOn: taskData.dependsOn || [],
            priority: taskData.priority || defaultPriority,
            complexity: taskData.complexity,
            status: 'pending',
            tags: taskData.tags || [],
            estimatedHours: taskData.estimatedHours
          };

          const createdTask = await storage.createTask(task);
          createdTasks.push(createdTask);

          if (taskData.dependsOn && taskData.dependsOn.length > 0) {
            taskDependencyMap.set(createdTask.id, taskData.dependsOn);
          }
        }

        // Update dependencies with actual task IDs
        await updateTaskDependencies(storage, createdTasks, taskDependencyMap);

        return {
          content: [{
            type: 'text' as const,
            text: `✅ PRD parsed successfully! Generated ${createdTasks.length} tasks for project "${project.name}".

📋 **Generated Tasks:**
${createdTasks.map(task =>
  `• **${task.name}** (Priority: ${task.priority}, Complexity: ${task.complexity || 'N/A'})
  ${task.details.substring(0, 100)}${task.details.length > 100 ? '...' : ''}
  Dependencies: ${task.dependsOn?.length ? task.dependsOn.join(', ') : 'None'}
  Tags: ${task.tags?.join(', ') || 'None'}`
).join('\n\n')}

🎯 **Next Steps:**
1. Review generated tasks and adjust priorities/dependencies as needed
2. Use \`get_next_task_recommendation\` to see which tasks are ready to start
3. Begin implementation with the recommended tasks`
          }],
          recommendedNextStep: 'get_next_task_recommendation',
          processed: false
        };

      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error parsing PRD: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  };
}

/**
 * Parse PRD content and extract task information
 * This is a simplified parser - in a real implementation, you might use NLP or LLM APIs
 */
async function parsePRDContent(prdContent: string, projectId: string, defaultPriority: number, estimateComplexity: boolean): Promise<CreateTaskInput[]> {
  const tasks: CreateTaskInput[] = [];

  // Simple parsing logic - look for common patterns in PRDs
  const sections = prdContent.split(/\n\s*\n/);

  for (const section of sections) {
    const lines = section.trim().split('\n');
    if (lines.length === 0) continue;

    // Look for task-like patterns
    const taskPatterns = [
      /^[-*]\s+(.+)/,  // Bullet points
      /^\d+\.\s+(.+)/, // Numbered lists
      /^(implement|create|build|develop|design|add|setup|configure)\s+(.+)/i, // Action verbs
      /^(feature|requirement|task):\s*(.+)/i // Explicit task markers
    ];

    for (const line of lines) {
      for (const pattern of taskPatterns) {
        const match = line.match(pattern);
        if (match) {
          const taskName = match[1] || match[2];
          if (taskName && taskName.length > 5) { // Filter out very short matches

            // Estimate complexity based on keywords
            let complexity = undefined;
            if (estimateComplexity) {
              complexity = estimateTaskComplexity(taskName, section);
            }

            // Extract tags from content
            const tags = extractTags(taskName, section);

            // Estimate hours based on complexity and content
            const estimatedHours = estimateHours(complexity, taskName, section);

            tasks.push({
              name: taskName.trim(),
              details: `${section.substring(0, 500)}${section.length > 500 ? '...' : ''}`,
              projectId,
              priority: defaultPriority,
              complexity,
              tags,
              estimatedHours
            });
          }
        }
      }
    }
  }

  // If no tasks found, create a general implementation task
  if (tasks.length === 0) {
    tasks.push({
      name: 'Implement PRD Requirements',
      details: prdContent.substring(0, 1000),
      projectId,
      priority: defaultPriority,
      complexity: estimateComplexity ? 7 : undefined,
      tags: ['implementation', 'prd'],
      estimatedHours: 40
    });
  }

  return tasks;
}

/**
 * Estimate task complexity based on content analysis
 */
function estimateTaskComplexity(taskName: string, context: string): number {
  const complexityKeywords = {
    high: ['architecture', 'system', 'integration', 'security', 'performance', 'scalability', 'database', 'api', 'framework'],
    medium: ['component', 'feature', 'interface', 'validation', 'testing', 'configuration'],
    low: ['button', 'text', 'style', 'color', 'layout', 'simple', 'basic']
  };

  const content = (taskName + ' ' + context).toLowerCase();

  let score = 5; // Default medium complexity

  for (const keyword of complexityKeywords.high) {
    if (content.includes(keyword)) score += 2;
  }

  for (const keyword of complexityKeywords.medium) {
    if (content.includes(keyword)) score += 1;
  }

  for (const keyword of complexityKeywords.low) {
    if (content.includes(keyword)) score -= 1;
  }

  return Math.max(1, Math.min(10, score));
}

/**
 * Extract relevant tags from task content
 */
function extractTags(taskName: string, context: string): string[] {
  const content = (taskName + ' ' + context).toLowerCase();
  const tags: string[] = [];

  const tagPatterns = {
    'frontend': ['ui', 'interface', 'component', 'react', 'vue', 'angular', 'css', 'html'],
    'backend': ['api', 'server', 'database', 'endpoint', 'service', 'microservice'],
    'testing': ['test', 'testing', 'unit test', 'integration test', 'e2e'],
    'security': ['auth', 'authentication', 'authorization', 'security', 'encryption'],
    'performance': ['performance', 'optimization', 'caching', 'speed'],
    'documentation': ['docs', 'documentation', 'readme', 'guide'],
    'setup': ['setup', 'configuration', 'install', 'deployment', 'environment']
  };

  for (const [tag, keywords] of Object.entries(tagPatterns)) {
    if (keywords.some(keyword => content.includes(keyword))) {
      tags.push(tag);
    }
  }

  return tags;
}

/**
 * Estimate hours based on complexity and content
 */
function estimateHours(complexity: number | undefined, taskName: string, context: string): number {
  if (!complexity) return 8; // Default 1 day

  const baseHours = complexity * 2; // 2-20 hours based on complexity

  // Adjust based on content length and keywords
  const content = (taskName + ' ' + context).toLowerCase();
  let multiplier = 1;

  if (content.includes('complex') || content.includes('advanced')) multiplier += 0.5;
  if (content.includes('simple') || content.includes('basic')) multiplier -= 0.3;
  if (content.includes('research') || content.includes('investigation')) multiplier += 0.4;

  return Math.max(1, Math.round(baseHours * multiplier));
}

/**
 * Update task dependencies with actual task IDs
 */
async function updateTaskDependencies(storage: Storage, createdTasks: Task[], dependencyMap: Map<string, string[]>): Promise<void> {
  // This is a simplified implementation
  // In a real scenario, you'd need more sophisticated dependency resolution
  // For now, we'll just clear dependencies since we don't have a way to map them properly
  for (const task of createdTasks) {
    if (dependencyMap.has(task.id)) {
      // Clear dependencies for now - would need more sophisticated mapping
      await storage.updateTask(task.id, { dependsOn: [] });
    }
  }
}
