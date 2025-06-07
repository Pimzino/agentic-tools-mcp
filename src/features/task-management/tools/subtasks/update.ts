import { z } from 'zod';
import { Storage } from '../../storage/storage.js';

/**
 * Update an existing subtask
 *
 * @param storage - Storage instance
 * @returns MCP tool handler for updating subtasks
 */
export function createUpdateSubtaskTool(storage: Storage) {
  return {
    name: 'update_subtask',
    description: 'Update the name, details, and/or completion status of an existing subtask',
    inputSchema: {
      id: z.string(),
      name: z.string().optional(),
      details: z.string().optional(),
      completed: z.boolean().optional()
    },
    handler: async ({ id, name, details, completed }: { id: string; name?: string; details?: string; completed?: boolean }) => {
      try {
        // Validate inputs
        if (!id || id.trim().length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: Subtask ID is required.'
            }],
            isError: true
          };
        }

        if (name !== undefined && (!name || name.trim().length === 0)) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: Subtask name must not be empty.'
            }],
            isError: true
          };
        }

        if (name !== undefined && name.trim().length > 100) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: Subtask name must be 100 characters or less.'
            }],
            isError: true
          };
        }

        if (details !== undefined && (!details || details.trim().length === 0)) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: Subtask details must not be empty.'
            }],
            isError: true
          };
        }

        if (details !== undefined && details.trim().length > 1000) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: Subtask details must be 1000 characters or less.'
            }],
            isError: true
          };
        }

        if (name === undefined && details === undefined && completed === undefined) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: At least one field (name, details, or completed) must be provided for update.'
            }],
            isError: true
          };
        }

        const existingSubtask = await storage.getSubtask(id.trim());

        if (!existingSubtask) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: Subtask with ID "${id}" not found. Use list_subtasks to see all available subtasks.`
            }],
            isError: true
          };
        }

        // Check for name uniqueness within the same task if name is being updated
        if (name && name.toLowerCase() !== existingSubtask.name.toLowerCase()) {
          const existingSubtasks = await storage.getSubtasks(existingSubtask.taskId);
          const nameExists = existingSubtasks.some(s => s.id !== id && s.name.toLowerCase() === name.toLowerCase());

          if (nameExists) {
            return {
              content: [{
                type: 'text' as const,
                text: `Error: A subtask with the name "${name}" already exists in this task. Please choose a different name.`
              }],
              isError: true
            };
          }
        }

        const updates: any = {
          updatedAt: new Date().toISOString()
        };

        if (name !== undefined) {
          updates.name = name.trim();
        }

        if (details !== undefined) {
          updates.details = details.trim();
        }

        if (completed !== undefined) {
          updates.completed = completed;
        }

        const updatedSubtask = await storage.updateSubtask(id, updates);

        if (!updatedSubtask) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: Failed to update subtask with ID "${id}".`
            }],
            isError: true
          };
        }

        // Get task and project information for display
        const task = await storage.getTask(updatedSubtask.taskId);
        const project = await storage.getProject(updatedSubtask.projectId);

        const taskName = task ? task.name : 'Unknown Task';
        const projectName = project ? project.name : 'Unknown Project';

        const changedFields = [];
        if (name !== undefined) changedFields.push('name');
        if (details !== undefined) changedFields.push('details');
        if (completed !== undefined) changedFields.push('completion status');

        const status = updatedSubtask.completed ? '✅ Completed' : '⏳ Pending';

        return {
          content: [{
            type: 'text' as const,
            text: `✅ Subtask updated successfully!

**${updatedSubtask.name}** (ID: ${updatedSubtask.id})
Task: ${taskName}
Project: ${projectName}
Status: ${status}
Details: ${updatedSubtask.details}
Last Updated: ${new Date(updatedSubtask.updatedAt).toLocaleString()}

Updated fields: ${changedFields.join(', ')}`
          }],
          recommendedNextStep: 'list_subtasks'
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error updating subtask: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  };
}
