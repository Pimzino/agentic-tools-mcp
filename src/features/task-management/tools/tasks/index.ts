import { Storage } from '../../storage/storage.js';
import { createCreateTaskTool } from './create.js';
import { createDeleteTaskTool } from './delete.js';
import { createGetTaskTool } from './get.js';
import { createListTasksTool } from './list.js';
import { createUpdateTaskTool } from './update.js';

/**
 * Migration tool for converting subtasks to the unified task model
 * Version 2.0: Added for smooth transition to unlimited hierarchy
 */
function createMigrateSubtasksTool(storage: Storage) {
  return {
    name: 'migrate_subtasks',
    description: 'Migrate existing subtasks to the unified task model. This tool converts all subtasks to tasks with parentId for unlimited nesting depth. Run this once after upgrading to ensure data compatibility.',
    inputSchema: {},
    handler: async () => {
      try {
        // Check migration status first
        const migrationStatus = await storage.getMigrationStatus();

        if (!migrationStatus.needsMigration) {
          return {
            content: [{
              type: 'text' as const,
              text: `✅ **Migration Status: Complete**

No migration needed! Your task management system is already using the unified task model.

📊 **Current Status:**
• Version: ${migrationStatus.version}
• Subtasks remaining: ${migrationStatus.subtaskCount}
• System: Up to date

🎯 **You can now enjoy unlimited task nesting!**
• Use \`create_task\` with \`parentId\` to create nested tasks
• Use \`list_tasks\` to see the hierarchical tree structure
• Use \`update_task\` to move tasks between hierarchy levels`
            }]
          };
        }

        // Perform migration
        const result = await storage.migrateToUnifiedModel();

        if (result.migratedSubtasks === 0 && result.errors.length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: `✅ **Migration Complete: No Data to Migrate**

Your system was already clean - no subtasks found to migrate.

📊 **Migration Summary:**
• Subtasks migrated: 0
• Errors: 0
• Status: ✅ Ready for unlimited hierarchy

🎯 **Next Steps:**
• Use \`create_task\` with \`parentId\` for nested tasks
• Use \`list_tasks\` to see hierarchical structures
• Use \`update_task\` to reorganize your task hierarchy`
            }]
          };
        }

        const errorSummary = result.errors.length > 0
          ? `\n\n⚠️ **Errors encountered:**\n${result.errors.map(e => `• ${e}`).join('\n')}`
          : '';

        return {
          content: [{
            type: 'text' as const,
            text: `🎉 **Migration Successful!**

Your subtasks have been successfully converted to the new unified task model with unlimited nesting depth!

📊 **Migration Summary:**
• Subtasks migrated: ${result.migratedSubtasks}
• Errors: ${result.errors.length}
• Status: ✅ Complete${errorSummary}

🚀 **What's New:**
• **Unlimited Depth**: Create tasks within tasks within tasks (no limits!)
• **Better Organization**: All tasks now have the same rich features
• **Flexible Hierarchy**: Easily move tasks between different levels

🎯 **Next Steps:**
• Use \`list_tasks\` to see your migrated task hierarchy
• Use \`create_task\` with \`parentId\` to add new nested tasks
• Use \`update_task\` with \`parentId\` to reorganize existing tasks
• Explore the new hierarchical structure with \`list_tasks\` and \`showHierarchy: true\`

💡 **Pro Tips:**
• Set \`parentId\` to create subtasks, sub-subtasks, etc.
• Leave \`parentId\` empty for top-level tasks
• Use the \`level\` field to understand task depth
• All your original task data and features are preserved!`
            }]
          };
      } catch (error: any) {
        return {
          content: [{
            type: 'text' as const,
            text: `❌ **Migration Failed**

An error occurred during migration: ${error instanceof Error ? error.message : 'Unknown error'}

🔧 **Troubleshooting:**
• Ensure you have proper permissions to modify task data
• Check that your workspace is properly set up
• Try running the migration again
• Contact support if the issue persists

⚠️ **Your data is safe** - the migration process preserves all original data.`
          }],
          isError: true
        };
      }
    }
  };
}

/**
 * Tool for moving tasks within the hierarchy
 * Version 2.0: New tool for unlimited depth task management
 */
function createMoveTaskTool(storage: Storage) {
  return {
    name: 'move_task',
    description: 'Move a task to a different parent in the hierarchy. Set newParentId to move under another task, or leave empty to move to top level. Supports unlimited nesting depth.',
    inputSchema: {
      taskId: { type: 'string' },
      newParentId: { type: 'string', optional: true }
    },
    handler: async ({ taskId, newParentId }: { taskId: string; newParentId?: string }) => {
      try {
        if (!taskId || taskId.trim().length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: Task ID is required.'
            }],
            isError: true
          };
        }

        const task = await storage.getTask(taskId.trim());
        if (!task) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: Task with ID "${taskId}" not found. Use list_tasks to see available tasks.`
            }],
            isError: true
          };
        }

        const oldParent = task.parentId ? await storage.getTask(task.parentId) : null;
        const newParent = newParentId ? await storage.getTask(newParentId.trim()) : null;

        // Validate new parent if specified
        if (newParentId && !newParent) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: New parent task with ID "${newParentId}" not found.`
            }],
            isError: true
          };
        }

        const movedTask = await storage.moveTask(taskId.trim(), newParentId?.trim());
        if (!movedTask) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: Failed to move task with ID "${taskId}".`
            }],
            isError: true
          };
        }

        // Build path information
        const ancestors = await storage.getTaskAncestors(movedTask.id);
        const project = await storage.getProject(movedTask.projectId);
        const projectName = project?.name || 'Unknown Project';

        const oldPath = oldParent
          ? `${projectName} → ${oldParent.name} → ${task.name}`
          : `${projectName} → ${task.name}`;

        const newPath = newParent
          ? `${projectName} → ${ancestors.map(a => a.name).join(' → ')} → ${movedTask.name}`
          : `${projectName} → ${movedTask.name}`;

        const levelIndicator = '  '.repeat(movedTask.level || 0) + '→';

        return {
          content: [{
            type: 'text' as const,
            text: `✅ **Task Moved Successfully!**

**${levelIndicator} ${movedTask.name}** (ID: ${movedTask.id})

📍 **Movement Summary:**
• From: ${oldPath}
• To: ${newPath}
• New Level: ${movedTask.level || 0} ${(movedTask.level || 0) === 0 ? '(Top-level)' : `(${movedTask.level} level${(movedTask.level || 0) > 1 ? 's' : ''} deep)`}
• New Parent: ${newParent ? `${newParent.name} (${newParent.id})` : 'None (Top-level)'}

🎯 **Next Steps:**
• Use \`list_tasks\` with \`showHierarchy: true\` to see the updated structure
• Continue organizing with \`move_task\` or \`update_task\`
• Add more nested tasks with \`create_task\` using parentId`
          }]
        };
      } catch (error: any) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error moving task: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  };
}

/**
 * Create all task-related tools
 * Version 2.0: Updated for unified task model with migration and hierarchy tools
 */
export function createTaskTools(storage: Storage) {
  return {
    create_task: createCreateTaskTool(storage),
    delete_task: createDeleteTaskTool(storage),
    get_task: createGetTaskTool(storage),
    list_tasks: createListTasksTool(storage),
    update_task: createUpdateTaskTool(storage),
    migrate_subtasks: createMigrateSubtasksTool(storage),
    move_task: createMoveTaskTool(storage)
  };
}
