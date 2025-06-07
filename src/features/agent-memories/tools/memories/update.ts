import { z } from 'zod';
import { MemoryStorage } from '../../storage/storage.js';

/**
 * Update an existing memory
 *
 * @param storage - Memory storage instance
 * @returns MCP tool handler for updating memories
 */
export function createUpdateMemoryTool(storage: MemoryStorage) {
  return {
    name: 'update_memory',
    description: 'Update an existing memory\'s title, content, metadata, or category',
    inputSchema: {
      id: z.string(),
      title: z.string().optional(),
      content: z.string().optional(),
      metadata: z.record(z.any()).optional(),
      category: z.string().optional()
    },
    handler: async ({
      id,
      title,
      content,
      metadata,
      category
    }: {
      id: string;
      title?: string;
      content?: string;
      metadata?: Record<string, any>;
      category?: string;
    }) => {
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

        if (content !== undefined && content.trim().length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: Content cannot be empty if provided.'
            }],
            isError: true
          };
        }

        if (title && title.trim().length > 50) {
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

        // Check if at least one field is being updated
        if (title === undefined && content === undefined && metadata === undefined && category === undefined) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: At least one field (title, content, metadata, or category) must be provided for update.'
            }],
            isError: true
          };
        }

        // Get the existing memory first
        const existingMemory = await storage.getMemory(id.trim());
        if (!existingMemory) {
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

        // Prepare updates
        const updates: any = {};
        if (title !== undefined) {
          updates.title = title.trim();
        }
        if (content !== undefined) {
          updates.content = content.trim();
        }
        if (metadata !== undefined) {
          updates.metadata = metadata;
        }
        if (category !== undefined) {
          updates.category = category.trim();
        }

        const updatedMemory = await storage.updateMemory(id.trim(), updates);

        if (!updatedMemory) {
          return {
            content: [{
              type: 'text' as const,
              text: `❌ Failed to update memory.

**Memory ID:** ${id}

The memory could not be updated. Please try again.`
            }],
            isError: true
          };
        }

        // Show what changed
        const changes: string[] = [];
        if (title !== undefined && title.trim() !== existingMemory.title) {
          changes.push('Title');
        }
        if (content !== undefined && content.trim() !== existingMemory.content) {
          changes.push('Content');
        }
        if (metadata !== undefined && JSON.stringify(metadata) !== JSON.stringify(existingMemory.metadata)) {
          changes.push('Metadata');
        }
        if (category !== undefined && category.trim() !== existingMemory.category) {
          changes.push('Category');
        }

        return {
          content: [{
            type: 'text' as const,
            text: `✅ Memory updated successfully!

**Memory ID:** ${updatedMemory.id}
**Updated Fields:** ${changes.join(', ')}
**Title:** ${updatedMemory.title}
**Content:** ${updatedMemory.content.substring(0, 200)}${updatedMemory.content.length > 200 ? '...' : ''}
**Category:** ${updatedMemory.category || 'Not specified'}
**Created:** ${new Date(updatedMemory.createdAt).toLocaleString()}
**Updated:** ${new Date(updatedMemory.updatedAt).toLocaleString()}
**Metadata:** ${Object.keys(updatedMemory.metadata).length > 0 ? JSON.stringify(updatedMemory.metadata, null, 2) : 'None'}`
          }],
          recommendedNextStep: 'search_memories'
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error updating memory: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  };
}
