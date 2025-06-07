import { z } from 'zod';
import { randomUUID } from 'crypto';
import { Storage } from '../../storage/storage.js';
import { Task } from '../../models/task.js';

/**
 * Create a new task within a project
 *
 * @param storage - Storage instance
 * @returns MCP tool handler for creating tasks
 */
export function createCreateTaskTool(storage: Storage) {
  return {
    name: 'create_task',
    description: 'Create a new task within a specific project with optional dependencies, priority, complexity, and other TaskMaster-like features',
    inputSchema: {
      name: z.string(),
      details: z.string(),
      projectId: z.string(),
      dependsOn: z.array(z.string()).optional(),
      priority: z.number().min(1).max(10).optional(),
      complexity: z.number().min(1).max(10).optional(),
      status: z.enum(['pending', 'in-progress', 'blocked', 'done']).optional(),
      tags: z.array(z.string()).optional(),
      estimatedHours: z.number().min(0).optional()
    },
    handler: async ({ name, details, projectId, dependsOn, priority, complexity, status, tags, estimatedHours }: {
      name: string;
      details: string;
      projectId: string;
      dependsOn?: string[];
      priority?: number;
      complexity?: number;
      status?: 'pending' | 'in-progress' | 'blocked' | 'done';
      tags?: string[];
      estimatedHours?: number;
    }) => {
      try {
        // Validate inputs
        if (!name || name.trim().length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: Task name is required.'
            }],
            isError: true
          };
        }

        if (name.trim().length > 100) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: Task name must be 100 characters or less.'
            }],
            isError: true
          };
        }

        if (!details || details.trim().length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: Task details are required.'
            }],
            isError: true
          };
        }

        if (details.trim().length > 2000) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: Task details must be 2000 characters or less.'
            }],
            isError: true
          };
        }

        if (!projectId || projectId.trim().length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: Project ID is required.'
            }],
            isError: true
          };
        }

        // Validate that project exists
        const project = await storage.getProject(projectId.trim());
        if (!project) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: Project with ID "${projectId}" not found. Use list_projects to see all available projects.`
            }],
            isError: true
          };
        }

        // Check for duplicate task names within the same project
        const existingTasks = await storage.getTasks(projectId);
        const nameExists = existingTasks.some(t => t.name.toLowerCase() === name.toLowerCase());

        if (nameExists) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: A task with the name "${name}" already exists in project "${project.name}". Please choose a different name.`
            }],
            isError: true
          };
        }

        // Validate dependencies exist if provided
        if (dependsOn && dependsOn.length > 0) {
          for (const depId of dependsOn) {
            const depTask = await storage.getTask(depId);
            if (!depTask) {
              return {
                content: [{
                  type: 'text' as const,
                  text: `Error: Dependency task with ID "${depId}" not found.`
                }],
                isError: true
              };
            }
          }
        }

        const now = new Date().toISOString();
        const task: Task = {
          id: randomUUID(),
          name: name.trim(),
          details: details.trim(),
          projectId,
          completed: false,
          createdAt: now,
          updatedAt: now,
          dependsOn: dependsOn || [],
          priority: priority || 5,
          complexity: complexity,
          status: status || 'pending',
          tags: tags || [],
          estimatedHours: estimatedHours
        };

        const createdTask = await storage.createTask(task);

        return {
          content: [{
            type: 'text' as const,
            text: `✅ Task created successfully!

**${createdTask.name}** (ID: ${createdTask.id})
Project: ${project.name}
Details: ${createdTask.details}
Priority: ${createdTask.priority}/10
Complexity: ${createdTask.complexity || 'Not set'}/10
Status: ${createdTask.status}
Tags: ${createdTask.tags?.join(', ') || 'None'}
Dependencies: ${createdTask.dependsOn?.length ? createdTask.dependsOn.join(', ') : 'None'}
Estimated Hours: ${createdTask.estimatedHours || 'Not set'}
Created: ${new Date(createdTask.createdAt).toLocaleString()}

🎯 **Next Steps:**
• Use \`get_next_task_recommendation\` to see if this task is ready to work on
• Add subtasks using \`create_subtask\` for complex tasks
• Update progress using \`update_task\` as you work`
          }],
          recommendedNextStep: 'get_next_task_recommendation'
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error creating task: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  };
}
