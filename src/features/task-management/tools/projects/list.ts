import { Storage } from '../../storage/storage.js';

/**
 * List all projects
 *
 * @param storage - Storage instance
 * @returns MCP tool handler for listing projects
 */
export function createListProjectsTool(storage: Storage) {
  return {
    name: 'list_projects',
    description: 'View all projects in the task management system',
    inputSchema: {},
    handler: async () => {
      try {
        const projects = await storage.getProjects();

        if (projects.length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: 'No projects found. Create your first project to get started!'
            }],
            recommendedNextStep: 'create_project'
          };
        }

        const projectList = projects.map(project => {
          return `**${project.name}** (ID: ${project.id})
Description: ${project.description}
Created: ${new Date(project.createdAt).toLocaleString()}
Updated: ${new Date(project.updatedAt).toLocaleString()}`;
        }).join('\n\n');

        return {
          content: [{
            type: 'text' as const,
            text: `Found ${projects.length} project(s):\n\n${projectList}`
          }],
          recommendedNextStep: 'create_project'
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error listing projects: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  };
}
