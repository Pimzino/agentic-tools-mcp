import { z } from 'zod';
import { Storage } from '../../storage/storage.js';

/**
 * Update an existing project
 *
 * @param storage - Storage instance
 * @returns MCP tool handler for updating projects
 */
export function createUpdateProjectTool(storage: Storage) {
  return {
    name: 'update_project',
    description: 'Update the name and/or description of an existing project',
    inputSchema: {
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional()
    },
    handler: async ({ id, name, description }: { id: string; name?: string; description?: string }) => {
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

        if (name !== undefined && (!name || name.trim().length === 0)) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: Project name must not be empty.'
            }],
            isError: true
          };
        }

        if (name !== undefined && name.trim().length > 100) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: Project name must be 100 characters or less.'
            }],
            isError: true
          };
        }

        if (description !== undefined && (!description || description.trim().length === 0)) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: Project description must not be empty.'
            }],
            isError: true
          };
        }

        if (description !== undefined && description.trim().length > 1000) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: Project description must be 1000 characters or less.'
            }],
            isError: true
          };
        }

        if (name === undefined && description === undefined) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: At least one field (name or description) must be provided for update.'
            }],
            isError: true
          };
        }

        const existingProject = await storage.getProject(id.trim());

        if (!existingProject) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: Project with ID "${id}" not found. Use list_projects to see all available projects.`
            }],
            isError: true
          };
        }

        // Check for name uniqueness if name is being updated
        if (name && name.toLowerCase() !== existingProject.name.toLowerCase()) {
          const existingProjects = await storage.getProjects();
          const nameExists = existingProjects.some(p => p.id !== id && p.name.toLowerCase() === name.toLowerCase());

          if (nameExists) {
            return {
              content: [{
                type: 'text' as const,
                text: `Error: A project with the name "${name}" already exists. Please choose a different name.`
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

        if (description !== undefined) {
          updates.description = description.trim();
        }

        const updatedProject = await storage.updateProject(id, updates);

        if (!updatedProject) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: Failed to update project with ID "${id}".`
            }],
            isError: true
          };
        }

        const changedFields = [];
        if (name !== undefined) changedFields.push('name');
        if (description !== undefined) changedFields.push('description');

        return {
          content: [{
            type: 'text' as const,
            text: `✅ Project updated successfully!

**${updatedProject.name}** (ID: ${updatedProject.id})
Description: ${updatedProject.description}
Last Updated: ${new Date(updatedProject.updatedAt).toLocaleString()}

Updated fields: ${changedFields.join(', ')}`
          }],
          recommendedNextStep: 'list_tasks'
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error updating project: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  };
}
