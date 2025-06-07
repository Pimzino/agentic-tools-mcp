import { z } from 'zod';
import { MemoryStorage } from '../../storage/storage.js';

/**
 * Delete a memory
 *
 * @param storage - Memory storage instance
 * @returns MCP tool handler for deleting memories
 */
export function createDeleteMemoryTool(storage: MemoryStorage) {
  return {
    name: 'delete_memory',
    description: 'Delete a memory by ID (requires confirmation)',
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
              text: 'Error: Memory ID is required.'
            }],
            isError: true
          };
        }

        if (!confirm) {
          return {
            content: [{
              type: 'text' as const,
              text: `⚠️ Deletion not confirmed.

**Memory ID:** ${id}

To delete this memory, you must set the 'confirm' parameter to true.
This action cannot be undone.

**Warning:** Deleting a memory will permanently remove it from the vector database.`
            }],
            isError: true
          };
        }

        // Get the memory first to show what's being deleted
        const memory = await storage.getMemory(id.trim());
        if (!memory) {
          return {
            content: [{
              type: 'text' as const,
              text: `❌ Memory not found.

**Memory ID:** ${id}

The memory with this ID does not exist or may have already been deleted.`
            }],
            isError: true
          };
        }

        // Delete the memory
        const deleted = await storage.deleteMemory(id.trim());

        if (!deleted) {
          return {
            content: [{
              type: 'text' as const,
              text: `❌ Failed to delete memory.

**Memory ID:** ${id}

The memory could not be deleted. Please try again.`
            }],
            isError: true
          };
        }

        return {
          content: [{
            type: 'text' as const,
            text: `✅ Memory deleted successfully!

**Deleted Memory Details:**
• **ID:** ${memory.id}
• **Title:** ${memory.title}
• **Content:** ${memory.content.substring(0, 200)}${memory.content.length > 200 ? '...' : ''}
• **Category:** ${memory.category || 'Not specified'}
• **Created:** ${new Date(memory.createdAt).toLocaleString()}

The memory has been permanently removed from storage and cannot be recovered.`
          }],
          recommendedNextStep: 'list_memories'
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error deleting memory: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  };
}
