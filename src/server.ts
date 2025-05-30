import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FileStorage } from './features/task-management/storage/file-storage.js';
import { FileStorage as MemoryFileStorage } from './features/agent-memories/storage/file-storage.js';
import { getVersion } from './utils/version.js';
import { StorageConfig, resolveWorkingDirectory, getWorkingDirectoryDescription, isWorkingDirectoryOptional } from './utils/storage-config.js';
import { z } from 'zod';

// Project tools
import { createListProjectsTool } from './features/task-management/tools/projects/list.js';
import { createCreateProjectTool } from './features/task-management/tools/projects/create.js';
import { createGetProjectTool } from './features/task-management/tools/projects/get.js';
import { createUpdateProjectTool } from './features/task-management/tools/projects/update.js';
import { createDeleteProjectTool } from './features/task-management/tools/projects/delete.js';

// Task tools
import { createListTasksTool } from './features/task-management/tools/tasks/list.js';
import { createCreateTaskTool } from './features/task-management/tools/tasks/create.js';
import { createGetTaskTool } from './features/task-management/tools/tasks/get.js';
import { createUpdateTaskTool } from './features/task-management/tools/tasks/update.js';
import { createDeleteTaskTool } from './features/task-management/tools/tasks/delete.js';

// Subtask tools
import { createListSubtasksTool } from './features/task-management/tools/subtasks/list.js';
import { createCreateSubtaskTool } from './features/task-management/tools/subtasks/create.js';
import { createGetSubtaskTool } from './features/task-management/tools/subtasks/get.js';
import { createUpdateSubtaskTool } from './features/task-management/tools/subtasks/update.js';
import { createDeleteSubtaskTool } from './features/task-management/tools/subtasks/delete.js';

// Memory tools
import { createCreateMemoryTool } from './features/agent-memories/tools/memories/create.js';
import { createSearchMemoriesTool } from './features/agent-memories/tools/memories/search.js';
import { createGetMemoryTool } from './features/agent-memories/tools/memories/get.js';
import { createListMemoriesTool } from './features/agent-memories/tools/memories/list.js';
import { createUpdateMemoryTool } from './features/agent-memories/tools/memories/update.js';
import { createDeleteMemoryTool } from './features/agent-memories/tools/memories/delete.js';

/**
 * Create storage instance for a specific working directory
 */
async function createStorage(workingDirectory: string | undefined, config: StorageConfig): Promise<FileStorage> {
  const resolvedDirectory = resolveWorkingDirectory(workingDirectory, config);
  const storage = new FileStorage(resolvedDirectory);
  await storage.initialize();
  return storage;
}

/**
 * Create memory storage instance for a specific working directory
 */
async function createMemoryStorage(workingDirectory: string | undefined, config: StorageConfig): Promise<MemoryFileStorage> {
  const resolvedDirectory = resolveWorkingDirectory(workingDirectory, config);
  const storage = new MemoryFileStorage(resolvedDirectory);
  await storage.initialize();
  return storage;
}

/**
 * Helper function to create workingDirectory schema based on configuration
 */
function createWorkingDirectorySchema(config: StorageConfig) {
  return isWorkingDirectoryOptional(config)
    ? z.string().optional().describe(getWorkingDirectoryDescription(config))
    : z.string().describe(getWorkingDirectoryDescription(config));
}

/**
 * Create and configure the MCP server for task management and agent memories
 */
export async function createServer(config: StorageConfig = { useGlobalDirectory: false }): Promise<McpServer> {
  // Create MCP server with dynamic version from package.json
  const server = new McpServer({
    name: '@pimzino/agentic-tools-mcp',
    version: getVersion()
  });

  // Register project management tools
  server.tool(
    'list_projects',
    'Discover and overview all your projects with comprehensive details and progress insights. Perfect for getting a bird\'s-eye view of your work portfolio, tracking project status, and quickly navigating between different initiatives in your workspace with project-specific storage.',
    {
      workingDirectory: createWorkingDirectorySchema(config)
    },
    async ({ workingDirectory }: { workingDirectory?: string }) => {
      try {
        const storage = await createStorage(workingDirectory, config);
        const tool = createListProjectsTool(storage);
        return await tool.handler();
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'create_project',
    'Launch new projects with structured organization and detailed documentation. Establishes a solid foundation for task management with Git-trackable project data, enabling seamless collaboration and progress tracking across your development workflow.',
    {
      workingDirectory: createWorkingDirectorySchema(config),
      name: z.string().describe('The name of the new project'),
      description: z.string().describe('A detailed description of the project')
    },
    async ({ workingDirectory, name, description }: { workingDirectory?: string; name: string; description: string }) => {
      try {
        const storage = await createStorage(workingDirectory, config);
        const tool = createCreateProjectTool(storage);
        return await tool.handler({ name, description });
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'get_project',
    'Access comprehensive project details including metadata, creation dates, and current status. Essential for project analysis, reporting, and understanding project context when planning tasks or reviewing progress in your development workflow.',
    {
      workingDirectory: createWorkingDirectorySchema(config),
      id: z.string().describe('The unique identifier of the project to retrieve')
    },
    async ({ workingDirectory, id }: { workingDirectory?: string; id: string }) => {
      try {
        const storage = await createStorage(workingDirectory, config);
        const tool = createGetProjectTool(storage);
        return await tool.handler({ id });
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'update_project',
    'Evolve and refine your project information as requirements change and scope develops. Maintain accurate project documentation with flexible updates to names and descriptions, ensuring your project data stays current and meaningful throughout the development lifecycle.',
    {
      workingDirectory: createWorkingDirectorySchema(config),
      id: z.string().describe('The unique identifier of the project to update'),
      name: z.string().optional().describe('New name for the project (optional)'),
      description: z.string().optional().describe('New description for the project (optional)')
    },
    async ({ workingDirectory, id, name, description }: { workingDirectory?: string; id: string; name?: string; description?: string }) => {
      try {
        const storage = await createStorage(workingDirectory, config);
        const tool = createUpdateProjectTool(storage);
        return await tool.handler({ id, name, description });
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'delete_project',
    'Safely remove completed or obsolete projects from your workspace with built-in confirmation safeguards. Permanently cleans up project data while protecting against accidental deletions, helping maintain an organized and current project portfolio.',
    {
      workingDirectory: createWorkingDirectorySchema(config),
      id: z.string().describe('The unique identifier of the project to delete'),
      confirm: z.boolean().describe('Must be set to true to confirm deletion (safety measure)')
    },
    async ({ workingDirectory, id, confirm }: { workingDirectory?: string; id: string; confirm: boolean }) => {
      try {
        const storage = await createStorage(workingDirectory, config);
        const tool = createDeleteProjectTool(storage);
        return await tool.handler({ id, confirm });
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // Register task management tools
  server.tool(
    'list_tasks',
    'Explore and organize your task portfolio with intelligent filtering and comprehensive progress tracking. View all tasks across projects or focus on specific project tasks, perfect for sprint planning, progress reviews, and maintaining productivity momentum.',
    {
      workingDirectory: createWorkingDirectorySchema(config),
      projectId: z.string().optional().describe('Filter tasks to only those belonging to this project (optional)')
    },
    async ({ workingDirectory, projectId }: { workingDirectory?: string; projectId?: string }) => {
      try {
        const storage = await createStorage(workingDirectory, config);
        const tool = createListTasksTool(storage);
        return await tool.handler({ projectId });
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'create_task',
    'Transform project goals into actionable, trackable tasks with detailed specifications and hierarchical organization. Build structured workflows that break down complex projects into manageable components, enabling clear progress tracking and team coordination.',
    {
      workingDirectory: createWorkingDirectorySchema(config),
      name: z.string().describe('The name/title of the new task'),
      details: z.string().describe('Detailed description of what the task involves'),
      projectId: z.string().describe('The ID of the project this task belongs to')
    },
    async ({ workingDirectory, name, details, projectId }: { workingDirectory?: string; name: string; details: string; projectId: string }) => {
      try {
        const storage = await createStorage(workingDirectory, config);
        const tool = createCreateTaskTool(storage);
        return await tool.handler({ name, details, projectId });
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'get_task',
    'Deep-dive into task specifics with comprehensive details including progress status, creation history, and full context. Essential for task analysis, status reporting, and understanding dependencies when planning work or conducting progress reviews.',
    {
      workingDirectory: createWorkingDirectorySchema(config),
      id: z.string().describe('The unique identifier of the task to retrieve')
    },
    async ({ workingDirectory, id }: { workingDirectory?: string; id: string }) => {
      try {
        const storage = await createStorage(workingDirectory, config);
        const tool = createGetTaskTool(storage);
        return await tool.handler({ id });
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'update_task',
    'Adapt and refine tasks as work progresses with flexible updates to specifications, descriptions, and completion status. Keep your workflow current and accurate, enabling dynamic project management that responds to changing requirements and discoveries.',
    {
      workingDirectory: createWorkingDirectorySchema(config),
      id: z.string().describe('The unique identifier of the task to update'),
      name: z.string().optional().describe('New name/title for the task (optional)'),
      details: z.string().optional().describe('New detailed description for the task (optional)'),
      completed: z.boolean().optional().describe('Mark task as completed (true) or incomplete (false) (optional)')
    },
    async ({ workingDirectory, id, name, details, completed }: { workingDirectory?: string; id: string; name?: string; details?: string; completed?: boolean }) => {
      try {
        const storage = await createStorage(workingDirectory, config);
        const tool = createUpdateTaskTool(storage);
        return await tool.handler({ id, name, details, completed });
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'delete_task',
    'Streamline your workflow by safely removing obsolete or completed tasks with built-in confirmation protection. Maintain a clean, focused task environment while preventing accidental data loss through required confirmation safeguards.',
    {
      workingDirectory: createWorkingDirectorySchema(config),
      id: z.string().describe('The unique identifier of the task to delete'),
      confirm: z.boolean().describe('Must be set to true to confirm deletion (safety measure)')
    },
    async ({ workingDirectory, id, confirm }: { workingDirectory?: string; id: string; confirm: boolean }) => {
      try {
        const storage = await createStorage(workingDirectory, config);
        const tool = createDeleteTaskTool(storage);
        return await tool.handler({ id, confirm });
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // Register subtask management tools
  server.tool(
    'list_subtasks',
    'Navigate your detailed work breakdown with granular subtask visibility and flexible filtering options. Perfect for sprint planning, daily standups, and detailed progress tracking across the complete project hierarchy from high-level goals to specific implementation steps.',
    {
      workingDirectory: createWorkingDirectorySchema(config),
      taskId: z.string().optional().describe('Filter subtasks to only those belonging to this task (optional)'),
      projectId: z.string().optional().describe('Filter subtasks to only those in this project (optional)')
    },
    async ({ workingDirectory, taskId, projectId }: { workingDirectory?: string; taskId?: string; projectId?: string }) => {
      try {
        const storage = await createStorage(workingDirectory, config);
        const tool = createListSubtasksTool(storage);
        return await tool.handler({ taskId, projectId });
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'create_subtask',
    'Break down complex tasks into precise, actionable subtasks with detailed specifications and clear ownership. Enable granular progress tracking and team coordination by decomposing work into manageable, measurable components within your hierarchical project structure.',
    {
      workingDirectory: createWorkingDirectorySchema(config),
      name: z.string().describe('The name/title of the new subtask'),
      details: z.string().describe('Detailed description of what the subtask involves'),
      taskId: z.string().describe('The ID of the parent task this subtask belongs to')
    },
    async ({ workingDirectory, name, details, taskId }: { workingDirectory?: string; name: string; details: string; taskId: string }) => {
      try {
        const storage = await createStorage(workingDirectory, config);
        const tool = createCreateSubtaskTool(storage);
        return await tool.handler({ name, details, taskId });
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'get_subtask',
    'Examine subtask details with comprehensive context including parent task relationships, progress status, and implementation specifics. Essential for detailed work planning, progress assessment, and understanding the complete scope of granular work items.',
    {
      workingDirectory: createWorkingDirectorySchema(config),
      id: z.string().describe('The unique identifier of the subtask to retrieve')
    },
    async ({ workingDirectory, id }: { workingDirectory?: string; id: string }) => {
      try {
        const storage = await createStorage(workingDirectory, config);
        const tool = createGetSubtaskTool(storage);
        return await tool.handler({ id });
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'update_subtask',
    'Fine-tune subtask specifications and track completion progress with flexible updates to names, descriptions, and status. Maintain accurate, up-to-date work records that reflect evolving requirements and real-time progress in your detailed project execution.',
    {
      workingDirectory: createWorkingDirectorySchema(config),
      id: z.string().describe('The unique identifier of the subtask to update'),
      name: z.string().optional().describe('New name/title for the subtask (optional)'),
      details: z.string().optional().describe('New detailed description for the subtask (optional)'),
      completed: z.boolean().optional().describe('Mark subtask as completed (true) or incomplete (false) (optional)')
    },
    async ({ workingDirectory, id, name, details, completed }: { workingDirectory?: string; id: string; name?: string; details?: string; completed?: boolean }) => {
      try {
        const storage = await createStorage(workingDirectory, config);
        const tool = createUpdateSubtaskTool(storage);
        return await tool.handler({ id, name, details, completed });
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'delete_subtask',
    'Clean up your detailed work breakdown by safely removing completed or obsolete subtasks with confirmation safeguards. Maintain focus on current priorities while preserving data integrity through required confirmation protocols.',
    {
      workingDirectory: createWorkingDirectorySchema(config),
      id: z.string().describe('The unique identifier of the subtask to delete'),
      confirm: z.boolean().describe('Must be set to true to confirm deletion (safety measure)')
    },
    async ({ workingDirectory, id, confirm }: { workingDirectory?: string; id: string; confirm: boolean }) => {
      try {
        const storage = await createStorage(workingDirectory, config);
        const tool = createDeleteSubtaskTool(storage);
        return await tool.handler({ id, confirm });
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  // Register agent memory management tools
  server.tool(
    'create_memory',
    'Capture and preserve important information, insights, or context as searchable memories with intelligent file-based storage. Ideal for building a knowledge base of user preferences, technical decisions, project context, or any information you want to remember and retrieve later with organized categorization.',
    {
      workingDirectory: createWorkingDirectorySchema(config),
      title: z.string().describe('Short title for the memory (max 50 characters for better file organization)'),
      content: z.string().describe('Detailed memory content/text (no character limit)'),
      metadata: z.record(z.any()).optional().describe('Optional metadata as key-value pairs for additional context'),
      category: z.string().optional().describe('Optional category to organize memories (e.g., "user_preferences", "project_context")')
    },
    async ({ workingDirectory, title, content, metadata, category }: {
      workingDirectory?: string;
      title: string;
      content: string;
      metadata?: Record<string, any>;
      category?: string;
    }) => {
      try {
        const storage = await createMemoryStorage(workingDirectory, config);
        const tool = createCreateMemoryTool(storage);
        return await tool.handler({ title, content, metadata, category });
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'search_memories',
    'Intelligently search through your stored memories using advanced text matching algorithms to quickly find relevant information. Features multi-field search across titles, content, and metadata with customizable relevance scoring - perfect for retrieving past decisions, preferences, or contextual information when you need it most.',
    {
      workingDirectory: createWorkingDirectorySchema(config),
      query: z.string().describe('The search query text to find matching memories'),
      limit: z.number().min(1).max(100).optional().describe('Maximum number of results to return (default: 10)'),
      threshold: z.number().min(0).max(1).optional().describe('Minimum relevance threshold 0-1 (default: 0.3)'),
      category: z.string().optional().describe('Filter results to memories in this specific category')
    },
    async ({ workingDirectory, query, limit, threshold, category }: {
      workingDirectory?: string;
      query: string;
      limit?: number;
      threshold?: number;
      category?: string;
    }) => {
      try {
        const storage = await createMemoryStorage(workingDirectory, config);
        const tool = createSearchMemoriesTool(storage);
        return await tool.handler({ query, limit, threshold, category });
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'get_memory',
    'Access comprehensive memory details including full content, metadata, creation history, and categorization. Essential for reviewing stored knowledge, understanding context, and retrieving complete information when making decisions or referencing past insights.',
    {
      workingDirectory: createWorkingDirectorySchema(config),
      id: z.string().describe('The unique identifier of the memory to retrieve')
    },
    async ({ workingDirectory, id }: { workingDirectory?: string; id: string }) => {
      try {
        const storage = await createMemoryStorage(workingDirectory, config);
        const tool = createGetMemoryTool(storage);
        return await tool.handler({ id });
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'list_memories',
    'Browse and explore your knowledge repository with organized memory listings and flexible category filtering. Perfect for reviewing stored information, discovering patterns in your knowledge base, and maintaining awareness of your accumulated insights and decisions.',
    {
      workingDirectory: createWorkingDirectorySchema(config),
      category: z.string().optional().describe('Filter to memories in this specific category'),
      limit: z.number().min(1).max(1000).optional().describe('Maximum number of memories to return (default: 50)')
    },
    async ({ workingDirectory, category, limit }: {
      workingDirectory?: string;
      category?: string;
      limit?: number;
    }) => {
      try {
        const storage = await createMemoryStorage(workingDirectory, config);
        const tool = createListMemoriesTool(storage);
        return await tool.handler({ category, limit });
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'update_memory',
    'Evolve and refine your stored knowledge with flexible updates to content, categorization, and metadata. Keep your memory repository current and accurate as understanding deepens, ensuring your knowledge base remains a reliable source of up-to-date insights and decisions.',
    {
      workingDirectory: createWorkingDirectorySchema(config),
      id: z.string().describe('The unique identifier of the memory to update'),
      title: z.string().optional().describe('New title for the memory (max 50 characters for better file organization)'),
      content: z.string().optional().describe('New detailed content for the memory (no character limit)'),
      metadata: z.record(z.any()).optional().describe('New metadata as key-value pairs (replaces existing metadata)'),
      category: z.string().optional().describe('New category for organizing the memory')
    },
    async ({ workingDirectory, id, title, content, metadata, category }: {
      workingDirectory?: string;
      id: string;
      title?: string;
      content?: string;
      metadata?: Record<string, any>;
      category?: string;
    }) => {
      try {
        const storage = await createMemoryStorage(workingDirectory, config);
        const tool = createUpdateMemoryTool(storage);
        return await tool.handler({ id, title, content, metadata, category });
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'delete_memory',
    'Safely remove outdated or irrelevant memories from your knowledge repository with built-in confirmation safeguards. Maintain a clean, focused memory collection while protecting against accidental loss of valuable information through required confirmation protocols.',
    {
      workingDirectory: createWorkingDirectorySchema(config),
      id: z.string().describe('The unique identifier of the memory to delete'),
      confirm: z.boolean().describe('Must be set to true to confirm deletion (safety measure)')
    },
    async ({ workingDirectory, id, confirm }: { workingDirectory?: string; id: string; confirm: boolean }) => {
      try {
        const storage = await createMemoryStorage(workingDirectory, config);
        const tool = createDeleteMemoryTool(storage);
        return await tool.handler({ id, confirm });
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  return server;
}
