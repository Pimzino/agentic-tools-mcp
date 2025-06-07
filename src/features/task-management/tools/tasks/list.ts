import { z } from 'zod';
import { Storage } from '../../storage/storage.js';

/**
 * List tasks, optionally filtered by project
 *
 * @param storage - Storage instance
 * @returns MCP tool handler for listing tasks
 */
export function createListTasksTool(storage: Storage) {
  return {
    name: 'list_tasks',
    description: 'View tasks, optionally filtered by project ID',
    inputSchema: {
      projectId: z.string().optional()
    },
    handler: async ({ projectId }: { projectId?: string }) => {
      try {
        // Validate project exists if projectId is provided
        if (projectId) {
          const project = await storage.getProject(projectId);
          if (!project) {
            return {
              content: [{
                type: 'text' as const,
                text: `Error: Project with ID "${projectId}" not found. Use list_projects to see all available projects.`
              }],
              isError: true
            };
          }
        }

        const tasks = await storage.getTasks(projectId);

        if (tasks.length === 0) {
          const message = projectId
            ? `No tasks found in the specified project. Create your first task using create_task.`
            : `No tasks found. Create your first task using create_task.`;

          return {
            content: [{
              type: 'text' as const,
              text: message
            }],
            recommendedNextStep: 'create_task'
          };
        }

        // Group tasks by project if showing all tasks
        let taskList: string;
        if (projectId) {
          taskList = tasks.map(task => {
            const status = task.completed ? '✅' : '⏳';
            return `${status} **${task.name}** (ID: ${task.id})
Details: ${task.details}
Status: ${task.completed ? 'Completed' : 'Pending'}
Created: ${new Date(task.createdAt).toLocaleString()}
Updated: ${new Date(task.updatedAt).toLocaleString()}`;
          }).join('\n\n');
        } else {
          // Group by project when showing all tasks
          const projects = await storage.getProjects();
          const projectMap = new Map(projects.map(p => [p.id, p.name]));

          const tasksByProject = tasks.reduce((acc, task) => {
            const projectName = projectMap.get(task.projectId) || 'Unknown Project';
            if (!acc[projectName]) acc[projectName] = [];
            acc[projectName].push(task);
            return acc;
          }, {} as Record<string, typeof tasks>);

          taskList = Object.entries(tasksByProject).map(([projectName, projectTasks]) => {
            const taskItems = projectTasks.map(task => {
              const status = task.completed ? '✅' : '⏳';
              return `  ${status} **${task.name}** (ID: ${task.id}) - ${task.details}`;
            }).join('\n');

            return `**Project: ${projectName}**\n${taskItems}`;
          }).join('\n\n');
        }

        const completedCount = tasks.filter(t => t.completed).length;
        const headerText = projectId
          ? `Found ${tasks.length} task(s) in project (${completedCount} completed):`
          : `Found ${tasks.length} task(s) across all projects (${completedCount} completed):`;

        return {
          content: [{
            type: 'text' as const,
            text: `${headerText}\n\n${taskList}`
          }],
          recommendedNextStep: 'get_next_task_recommendation'
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error listing tasks: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  };
}
