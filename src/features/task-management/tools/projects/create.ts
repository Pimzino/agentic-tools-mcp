import { z } from 'zod';
import { randomUUID } from 'crypto';
import { Storage } from '../../storage/storage.js';
import { Project } from '../../models/project.js';

/**
 * Create a new project
 *
 * @param storage - Storage instance
 * @returns MCP tool handler for creating projects
 */
export function createCreateProjectTool(storage: Storage) {
  return {
    name: 'create_project',
    description: 'Create a new project in the task management system',
    inputSchema: {
      name: z.string(),
      description: z.string()
    },
    handler: async ({ name, description }: { name: string; description: string }) => {
      try {
        // Validate inputs
        if (!name || name.trim().length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: Project name is required.'
            }],
            isError: true
          };
        }

        if (name.trim().length > 100) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: Project name must be 100 characters or less.'
            }],
            isError: true
          };
        }

        if (!description || description.trim().length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: Project description is required.'
            }],
            isError: true
          };
        }

        if (description.trim().length > 1000) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: Project description must be 1000 characters or less.'
            }],
            isError: true
          };
        }

        // Validate that project name is unique
        const existingProjects = await storage.getProjects();
        const nameExists = existingProjects.some(p => p.name.toLowerCase() === name.trim().toLowerCase());

        if (nameExists) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: A project with the name "${name.trim()}" already exists. Please choose a different name.`
            }],
            isError: true
          };
        }

        const now = new Date().toISOString();
        const project: Project = {
          id: randomUUID(),
          name: name.trim(),
          description: description.trim(),
          createdAt: now,
          updatedAt: now
        };

        const createdProject = await storage.createProject(project);

        return {
          content: [{
            type: 'text' as const,
            text: `✅ Project created successfully!

**${createdProject.name}** (ID: ${createdProject.id})
Description: ${createdProject.description}
Created: ${new Date(createdProject.createdAt).toLocaleString()}

You can now add tasks to this project using the create_task tool.`
          }],
          recommendedNextStep: 'create_task'
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error creating project: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  };
}
