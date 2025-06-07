import { z } from 'zod';
import { randomUUID } from 'crypto';
import { Storage } from '../../storage/storage.js';
import { Subtask } from '../../models/subtask.js';

/**
 * Create a new subtask within a task
 *
 * @param storage - Storage instance
 * @returns MCP tool handler for creating subtasks
 */
export function createCreateSubtaskTool(storage: Storage) {
  return {
    name: 'create_subtask',
    description: 'Create a new subtask within a specific task',
    inputSchema: {
      name: z.string(),
      details: z.string(),
      taskId: z.string()
    },
    handler: async ({ name, details, taskId }: { name: string; details: string; taskId: string }) => {
      try {
        // Validate inputs
        if (!name || name.trim().length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: Subtask name is required.'
            }],
            isError: true
          };
        }

        if (name.trim().length > 100) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: Subtask name must be 100 characters or less.'
            }],
            isError: true
          };
        }

        if (!details || details.trim().length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: Subtask details are required.'
            }],
            isError: true
          };
        }

        if (details.trim().length > 1000) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: Subtask details must be 1000 characters or less.'
            }],
            isError: true
          };
        }

        if (!taskId || taskId.trim().length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: Task ID is required.'
            }],
            isError: true
          };
        }

        // Validate that task exists
        const task = await storage.getTask(taskId.trim());
        if (!task) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: Task with ID "${taskId}" not found. Use list_tasks to see all available tasks.`
            }],
            isError: true
          };
        }

        // Get project information
        const project = await storage.getProject(task.projectId);
        const projectName = project ? project.name : 'Unknown Project';

        // Check for duplicate subtask names within the same task
        const existingSubtasks = await storage.getSubtasks(taskId);
        const nameExists = existingSubtasks.some(s => s.name.toLowerCase() === name.toLowerCase());

        if (nameExists) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: A subtask with the name "${name}" already exists in task "${task.name}". Please choose a different name.`
            }],
            isError: true
          };
        }

        const now = new Date().toISOString();
        const subtask: Subtask = {
          id: randomUUID(),
          name: name.trim(),
          details: details.trim(),
          taskId,
          projectId: task.projectId,
          completed: false,
          createdAt: now,
          updatedAt: now
        };

        const createdSubtask = await storage.createSubtask(subtask);

        return {
          content: [{
            type: 'text' as const,
            text: `✅ Subtask created successfully!

**${createdSubtask.name}** (ID: ${createdSubtask.id})
Task: ${task.name}
Project: ${projectName}
Details: ${createdSubtask.details}
Status: Pending
Created: ${new Date(createdSubtask.createdAt).toLocaleString()}

You can mark this subtask as completed using update_subtask.`
          }],
          recommendedNextStep: 'update_subtask'
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error creating subtask: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  };
}
