import { z } from 'zod';
import { MemoryStorage } from '../../storage/storage.js';

/**
 * Get a specific memory by ID
 *
 * @param storage - Memory storage instance
 * @returns MCP tool handler for getting memories
 */
export function createGetMemoryTool(storage: MemoryStorage) {
  return {
    name: 'get_memory',
    description: 'Get a specific memory by its ID',
    inputSchema: {
      id: z.string()
    },
    handler: async ({ id }: { id: string }) => {
      try {
        // Validate inputs
        if (!id || id.trim().length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: Memory ID is required.'
            }],
            isError: true
          };
        }

        const memory = await storage.getMemory(id.trim());

        if (!memory) {
          return {
            content: [{
              type: 'text' as const,
              text: `❌ Memory not found.

**Memory ID:** ${id}

The memory with this ID does not exist or may have been deleted.`
            }],
            isError: true
          };
        }

        return {
          content: [{
            type: 'text' as const,
            text: `📋 Memory Details:

**Memory ID:** ${memory.id}
**Title:** ${memory.title}
**Content:** ${memory.content}
**Category:** ${memory.category || 'Not specified'}
**Created:** ${new Date(memory.createdAt).toLocaleString()}
**Updated:** ${new Date(memory.updatedAt).toLocaleString()}
**Metadata:** ${Object.keys(memory.metadata).length > 0 ? JSON.stringify(memory.metadata, null, 2) : 'None'}`
          }],
          recommendedNextStep: 'update_memory'
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error retrieving memory: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  };
}
