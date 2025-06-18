import { z } from 'zod';
import { randomUUID } from 'crypto';
import { Storage } from '../../storage/storage.js';
import { Task } from '../../models/task.js';

/**
 * Create a new task within a project with unlimited nesting depth
 * Version 2.0: Updated for unified task model supporting unlimited hierarchy
 *
 * @param storage - Storage instance
 * @returns MCP tool handler for creating tasks
 */
export function createCreateTaskTool(storage: Storage) {
  return {
    name: 'create_task',
    description: 'Create a new task within a specific project. Supports unlimited nesting depth - set parentId to create subtasks, sub-subtasks, etc. Leave parentId empty for top-level tasks.',
    inputSchema: {
      name: z.string(),
      details: z.string(),
      projectId: z.string(),
      parentId: z.string().optional(),
      dependsOn: z.array(z.string()).optional(),
      priority: z.number().min(1).max(10).optional(),
      complexity: z.number().min(1).max(10).optional(),
      status: z.enum(['pending', 'in-progress', 'blocked', 'done']).optional(),
      tags: z.array(z.string()).optional(),
      estimatedHours: z.number().min(0).optional()
    },
    handler: async ({ name, details, projectId, parentId, dependsOn, priority, complexity, status, tags, estimatedHours }: {
      name: string;
      details: string;
      projectId: string;
      parentId?: string;
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

        let parentTask = null;
        let taskLevel = 0;

        // Validate parent task exists if parentId is provided
        if (parentId) {
          parentTask = await storage.getTask(parentId.trim());
          if (!parentTask) {
            return {
              content: [{
                type: 'text' as const,
                text: `Error: Parent task with ID "${parentId}" not found. Use list_tasks to see available tasks.`
              }],
              isError: true
            };
          }

          // Ensure parent belongs to the same project
          if (parentTask.projectId !== projectId) {
            return {
              content: [{
                type: 'text' as const,
                text: `Error: Parent task belongs to a different project. Tasks can only be nested within the same project.`
              }],
              isError: true
            };
          }

          taskLevel = (parentTask.level || 0) + 1;
        }

        // Check for duplicate task names within the same parent scope
        const siblingTasks = await storage.getTasks(projectId, parentId);
        const nameExists = siblingTasks.some(t => t.name.toLowerCase() === name.toLowerCase());

        if (nameExists) {
          const scopeDescription = parentTask
            ? `under parent task "${parentTask.name}"`
            : `at the top level of project "${project.name}"`;
          return {
            content: [{
              type: 'text' as const,
              text: `Error: A task with the name "${name}" already exists ${scopeDescription}. Please choose a different name.`
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
          parentId: parentId?.trim() || undefined,
          completed: false,
          createdAt: now,
          updatedAt: now,
          dependsOn: dependsOn || [],
          priority: priority || 5,
          complexity: complexity,
          status: status || 'pending',
          tags: tags || [],
          estimatedHours: estimatedHours,
          level: taskLevel
        };

        const createdTask = await storage.createTask(task);

        const hierarchyPath = parentTask
          ? `${project.name} → ${parentTask.name} → ${createdTask.name}`
          : `${project.name} → ${createdTask.name}`;

        const levelIndicator = '  '.repeat(taskLevel) + '→';

        return {
          content: [{
            type: 'text' as const,
            text: `✅ Task created successfully!

**${levelIndicator} ${createdTask.name}** (ID: ${createdTask.id})
${parentTask ? `Parent: ${parentTask.name} (${parentTask.id})` : 'Top-level task'}
Project: ${project.name}
Level: ${taskLevel} ${taskLevel === 0 ? '(Top-level)' : `(${taskLevel} level${taskLevel > 1 ? 's' : ''} deep)`}
Path: ${hierarchyPath}

📋 **Task Details:**
• Details: ${createdTask.details}
• Priority: ${createdTask.priority}/10
• Complexity: ${createdTask.complexity || 'Not set'}/10
• Status: ${createdTask.status}
• Tags: ${createdTask.tags?.join(', ') || 'None'}
• Dependencies: ${createdTask.dependsOn?.length ? createdTask.dependsOn.join(', ') : 'None'}
• Estimated Hours: ${createdTask.estimatedHours || 'Not set'}
• Created: ${new Date(createdTask.createdAt).toLocaleString()}

🎯 **Next Steps:**
${taskLevel === 0
  ? '• Break down into smaller tasks using create_task with parentId for complex work'
  : '• Add even more granular tasks if needed using create_task with this task as parentId'
}
• Use \`get_next_task_recommendation\` to see if this task is ready to work on
• Update progress using \`update_task\` as you work
• Use \`list_tasks\` with projectId and parentId to see the task hierarchy`
          }]
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
