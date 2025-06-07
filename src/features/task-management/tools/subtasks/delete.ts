import { z } from 'zod';
import { Storage } from '../../storage/storage.js';

/**
 * Delete a subtask
 *
 * @param storage - Storage instance
 * @returns MCP tool handler for deleting subtasks
 */
export function createDeleteSubtaskTool(storage: Storage) {
  return {
    name: 'delete_subtask',
    description: 'Delete a subtask. This action cannot be undone.',
    inputSchema: {
      id: z.string(),
      confirm: z.boolean()
    },
    handler: async ({ id, confirm }: { id: string; confirm: boolean }) => {
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

        if (confirm !== true) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: You must set confirm to true to delete a subtask.'
            }],
            isError: true
          };
        }

        const subtask = await storage.getSubtask(id.trim());

        if (!subtask) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: Subtask with ID "${id}" not found. Use list_subtasks to see all available subtasks.`
            }],
            isError: true
          };
        }

        // Get task and project information for display
        const task = await storage.getTask(subtask.taskId);
        const project = await storage.getProject(subtask.projectId);

        const taskName = task ? task.name : 'Unknown Task';
        const projectName = project ? project.name : 'Unknown Project';

        const deleted = await storage.deleteSubtask(id);

        if (!deleted) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: Failed to delete subtask with ID "${id}".`
            }],
            isError: true
          };
        }

        return {
          content: [{
            type: 'text' as const,
            text: `✅ Subtask deleted successfully!

**Deleted:** "${subtask.name}" (ID: ${subtask.id})
**Task:** ${taskName}
**Project:** ${projectName}

This action cannot be undone. The subtask has been permanently removed.`
          }],
          recommendedNextStep: 'list_subtasks'
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error deleting subtask: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  };
}
