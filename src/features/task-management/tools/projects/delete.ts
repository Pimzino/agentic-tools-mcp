import { z } from 'zod';
import { Storage } from '../../storage/storage.js';

/**
 * Delete a project and all associated tasks and subtasks
 *
 * @param storage - Storage instance
 * @returns MCP tool handler for deleting projects
 */
export function createDeleteProjectTool(storage: Storage) {
  return {
    name: 'delete_project',
    description: 'Delete a project and all its associated tasks and subtasks. This action cannot be undone.',
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
              text: 'Error: Project ID is required.'
            }],
            isError: true
          };
        }

        if (confirm !== true) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: You must set confirm to true to delete a project.'
            }],
            isError: true
          };
        }

        const project = await storage.getProject(id.trim());

        if (!project) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: Project with ID "${id}" not found. Use list_projects to see all available projects.`
            }],
            isError: true
          };
        }

        // Get counts for confirmation message
        const tasks = await storage.getTasks(project.id);
        const subtasks = await storage.getSubtasks(undefined, project.id);

        const deleted = await storage.deleteProject(id);

        if (!deleted) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: Failed to delete project with ID "${id}".`
            }],
            isError: true
          };
        }

        return {
          content: [{
            type: 'text' as const,
            text: `✅ Project deleted successfully!

**Deleted:** "${project.name}" (ID: ${project.id})
**Also deleted:** ${tasks.length} task(s) and ${subtasks.length} subtask(s)

This action cannot be undone. All data associated with this project has been permanently removed.`
          }],
          recommendedNextStep: 'list_projects'
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error deleting project: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  };
}
