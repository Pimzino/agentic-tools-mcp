import { z } from 'zod';
import { Storage } from '../../storage/storage.js';

/**
 * Get task details by ID
 *
 * @param storage - Storage instance
 * @returns MCP tool handler for getting task details
 */
export function createGetTaskTool(storage: Storage) {
  return {
    name: 'get_task',
    description: 'Get detailed information about a specific task by its ID',
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
              text: 'Error: Task ID is required.'
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

        // Get project information
        const project = await storage.getProject(task.projectId);
        const projectName = project ? project.name : 'Unknown Project';

        // Get related subtasks for summary
        const subtasks = await storage.getSubtasks(task.id);
        const completedSubtasks = subtasks.filter(s => s.completed).length;

        const status = task.completed ? '✅ Completed' : '⏳ Pending';
        const subtaskSummary = subtasks.length > 0
          ? `\n**Subtasks:** ${completedSubtasks}/${subtasks.length} completed`
          : '\n**Subtasks:** None';

        return {
          content: [{
            type: 'text' as const,
            text: `**${task.name}** (ID: ${task.id})

**Project:** ${projectName}
**Status:** ${status}
**Details:** ${task.details}

**Created:** ${new Date(task.createdAt).toLocaleString()}
**Last Updated:** ${new Date(task.updatedAt).toLocaleString()}${subtaskSummary}

Use list_subtasks with taskId="${task.id}" to see all subtasks for this task.`
          }],
          recommendedNextStep: 'list_subtasks'
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error retrieving task: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  };
}
