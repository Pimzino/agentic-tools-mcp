import { z } from 'zod';
import { Storage } from '../../storage/storage.js';

/**
 * Delete a task and all associated subtasks
 *
 * @param storage - Storage instance
 * @returns MCP tool handler for deleting tasks
 */
export function createDeleteTaskTool(storage: Storage) {
  return {
    name: 'delete_task',
    description: 'Delete a task and all its associated subtasks. This action cannot be undone.',
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
              text: 'Error: Task ID is required.'
            }],
            isError: true
          };
        }

        if (confirm !== true) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: You must set confirm to true to delete a task.'
            }],
            isError: true
          };
        }

        const task = await storage.getTask(id.trim());

        if (!task) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: Task with ID "${id}" not found. Use list_tasks to see all available tasks.`
            }],
            isError: true
          };
        }

        // Get project information for display
        const project = await storage.getProject(task.projectId);
        const projectName = project ? project.name : 'Unknown Project';

        // Get count of subtasks for confirmation message
        const subtasks = await storage.getSubtasks(task.id);

        const deleted = await storage.deleteTask(id);

        if (!deleted) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: Failed to delete task with ID "${id}".`
            }],
            isError: true
          };
        }

        return {
          content: [{
            type: 'text' as const,
            text: `✅ Task deleted successfully!

**Deleted:** "${task.name}" (ID: ${task.id})
**Project:** ${projectName}
**Also deleted:** ${subtasks.length} subtask(s)

This action cannot be undone. All data associated with this task has been permanently removed.`
          }],
          recommendedNextStep: 'list_tasks'
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error deleting task: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  };
}
