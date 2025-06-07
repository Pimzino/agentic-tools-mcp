import { z } from 'zod';
import { Storage } from '../../storage/storage.js';

/**
 * List subtasks, optionally filtered by task or project
 *
 * @param storage - Storage instance
 * @returns MCP tool handler for listing subtasks
 */
export function createListSubtasksTool(storage: Storage) {
  return {
    name: 'list_subtasks',
    description: 'View subtasks, optionally filtered by task ID or project ID',
    inputSchema: {
      taskId: z.string().optional(),
      projectId: z.string().optional()
    },
    handler: async ({ taskId, projectId }: { taskId?: string; projectId?: string }) => {
      try {
        // Validate task exists if taskId is provided
        if (taskId) {
          const task = await storage.getTask(taskId);
          if (!task) {
            return {
              content: [{
                type: 'text' as const,
                text: `Error: Task with ID "${taskId}" not found. Use list_tasks to see all available tasks.`
              }],
              isError: true
            };
          }
        }

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

        const subtasks = await storage.getSubtasks(taskId, projectId);

        if (subtasks.length === 0) {
          let message = 'No subtasks found.';
          if (taskId) {
            message = `No subtasks found for the specified task. Create your first subtask using create_subtask.`;
          } else if (projectId) {
            message = `No subtasks found in the specified project. Create your first subtask using create_subtask.`;
          } else {
            message = `No subtasks found. Create your first subtask using create_subtask.`;
          }

          return {
            content: [{
              type: 'text' as const,
              text: message
            }],
            recommendedNextStep: 'create_subtask'
          };
        }

        // Get additional context for display
        const tasks = await storage.getTasks();
        const projects = await storage.getProjects();
        const taskMap = new Map(tasks.map(t => [t.id, t.name]));
        const projectMap = new Map(projects.map(p => [p.id, p.name]));

        let subtaskList: string;
        if (taskId) {
          // Show subtasks for a specific task
          subtaskList = subtasks.map(subtask => {
            const status = subtask.completed ? '✅' : '⏳';
            return `${status} **${subtask.name}** (ID: ${subtask.id})
Details: ${subtask.details}
Status: ${subtask.completed ? 'Completed' : 'Pending'}
Created: ${new Date(subtask.createdAt).toLocaleString()}
Updated: ${new Date(subtask.updatedAt).toLocaleString()}`;
          }).join('\n\n');
        } else {
          // Group by task when showing multiple tasks' subtasks
          const subtasksByTask = subtasks.reduce((acc, subtask) => {
            const taskName = taskMap.get(subtask.taskId) || 'Unknown Task';
            const projectName = projectMap.get(subtask.projectId) || 'Unknown Project';
            const key = `${projectName} > ${taskName}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(subtask);
            return acc;
          }, {} as Record<string, typeof subtasks>);

          subtaskList = Object.entries(subtasksByTask).map(([taskPath, taskSubtasks]) => {
            const subtaskItems = taskSubtasks.map(subtask => {
              const status = subtask.completed ? '✅' : '⏳';
              return `  ${status} **${subtask.name}** (ID: ${subtask.id}) - ${subtask.details}`;
            }).join('\n');

            return `**${taskPath}**\n${subtaskItems}`;
          }).join('\n\n');
        }

        const completedCount = subtasks.filter(s => s.completed).length;
        let headerText = `Found ${subtasks.length} subtask(s) (${completedCount} completed):`;

        if (taskId) {
          const task = await storage.getTask(taskId);
          const taskName = task ? task.name : 'Unknown Task';
          headerText = `Found ${subtasks.length} subtask(s) in task "${taskName}" (${completedCount} completed):`;
        } else if (projectId) {
          const project = await storage.getProject(projectId);
          const projectName = project ? project.name : 'Unknown Project';
          headerText = `Found ${subtasks.length} subtask(s) in project "${projectName}" (${completedCount} completed):`;
        }

        return {
          content: [{
            type: 'text' as const,
            text: `${headerText}\n\n${subtaskList}`
          }],
          recommendedNextStep: 'update_subtask'
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error listing subtasks: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  };
}
