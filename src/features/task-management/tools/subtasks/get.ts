import { z } from 'zod';
import { Storage } from '../../storage/storage.js';

/**
 * Get subtask details by ID
 *
 * @param storage - Storage instance
 * @returns MCP tool handler for getting subtask details
 */
export function createGetSubtaskTool(storage: Storage) {
  return {
    name: 'get_subtask',
    description: 'Get detailed information about a specific subtask by its ID',
    inputSchema: {
      id: z.string()
    },
    handler: async ({ id }: { id: string }) => {
      try {
        // Validate input
        if (!id || id.trim().length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: Subtask ID is required.'
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

        // Get task and project information
        const task = await storage.getTask(subtask.taskId);
        const project = await storage.getProject(subtask.projectId);

        const taskName = task ? task.name : 'Unknown Task';
        const projectName = project ? project.name : 'Unknown Project';
        const status = subtask.completed ? '✅ Completed' : '⏳ Pending';

        return {
          content: [{
            type: 'text' as const,
            text: `**${subtask.name}** (ID: ${subtask.id})

**Task:** ${taskName}
**Project:** ${projectName}
**Status:** ${status}
**Details:** ${subtask.details}

**Created:** ${new Date(subtask.createdAt).toLocaleString()}
**Last Updated:** ${new Date(subtask.updatedAt).toLocaleString()}

Use update_subtask to modify this subtask or mark it as completed.`
          }],
          recommendedNextStep: 'update_subtask'
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error retrieving subtask: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  };
}
