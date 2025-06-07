import { z } from 'zod';
import { randomUUID } from 'crypto';
import { MemoryStorage } from '../../storage/storage.js';
import { Memory } from '../../models/memory.js';

/**
 * Create a new memory
 *
 * @param storage - Memory storage instance
 * @returns MCP tool handler for creating memories
 */
export function createCreateMemoryTool(storage: MemoryStorage) {
  return {
    name: 'create_memory',
    description: 'Create a new memory in the agent memories system',
    inputSchema: {
      title: z.string(),
      content: z.string(),
      metadata: z.record(z.any()).optional(),
      category: z.string().optional()
    },
    handler: async ({
      title,
      content,
      metadata = {},
      category
    }: {
      title: string;
      content: string;
      metadata?: Record<string, any>;
      category?: string;
    }) => {
      try {
        // Validate inputs
        if (!title || title.trim().length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: Title cannot be empty.'
            }],
            isError: true
          };
        }

        if (!content || content.trim().length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: Memory content is required.'
            }],
            isError: true
          };
        }

        if (title.trim().length > 50) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: Memory title must be 50 characters or less for better file organization. Current length: ${title.trim().length} characters.

Please provide a short, descriptive title instead. For example:
- "User prefers dark mode interface"
- "Project uses TypeScript and React"
- "Database connection timeout is 30s"

Use the content field for detailed information.`
            }],
            isError: true
          };
        }

        if (category && category.trim().length > 100) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: Category must be 100 characters or less.'
            }],
            isError: true
          };
        }

        const now = new Date().toISOString();
        const memory: Memory = {
          id: randomUUID(),
          title: title.trim(),
          content: content.trim(),
          metadata,
          createdAt: now,
          updatedAt: now,
          category: category?.trim()
        };

        const createdMemory = await storage.createMemory(memory);

        return {
          content: [{
            type: 'text' as const,
            text: `✅ Memory created successfully!

**Memory ID:** ${createdMemory.id}
**Title:** ${createdMemory.title}
**Content:** ${createdMemory.content.substring(0, 200)}${createdMemory.content.length > 200 ? '...' : ''}
**Category:** ${createdMemory.category || 'Not specified'}
**Created:** ${new Date(createdMemory.createdAt).toLocaleString()}
**Metadata:** ${Object.keys(createdMemory.metadata).length > 0 ? JSON.stringify(createdMemory.metadata, null, 2) : 'None'}

The memory has been stored and is ready for text-based search.`
          }],
          recommendedNextStep: 'search_memories'
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error creating memory: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  };
}
