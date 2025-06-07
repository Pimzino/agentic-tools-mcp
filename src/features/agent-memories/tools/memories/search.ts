import { z } from 'zod';
import { MemoryStorage } from '../../storage/storage.js';

/**
 * Search memories by semantic similarity
 *
 * @param storage - Memory storage instance
 * @returns MCP tool handler for searching memories
 */
export function createSearchMemoriesTool(storage: MemoryStorage) {
  return {
    name: 'search_memories',
    description: 'Search memories by text content matching',
    inputSchema: {
      query: z.string(),
      limit: z.number().min(1).max(100).optional(),
      threshold: z.number().min(0).max(1).optional(),
      category: z.string().optional()
    },
    handler: async ({
      query,
      limit = 10,
      threshold,
      category
    }: {
      query: string;
      limit?: number;
      threshold?: number;
      category?: string;
    }) => {
      try {
        // Validate inputs
        if (!query || query.trim().length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: Search query is required.'
            }],
            isError: true
          };
        }

        if (query.trim().length > 1000) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: Search query must be 1000 characters or less.'
            }],
            isError: true
          };
        }

        if (limit < 1 || limit > 100) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: Limit must be between 1 and 100.'
            }],
            isError: true
          };
        }

        if (threshold !== undefined && (threshold < 0 || threshold > 1)) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: Threshold must be between 0 and 1.'
            }],
            isError: true
          };
        }

        const searchInput = {
          query: query.trim(),
          limit,
          threshold, // Will use config default if undefined
          category: category?.trim()
        };

        const results = await storage.searchMemories(searchInput);

        // Get the actual threshold used (from config if not provided)
        const actualThreshold = threshold ?? (storage as any).config?.defaultThreshold ?? 0.3;

        if (results.length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: `🔍 No memories found matching your search criteria.

**Query:** "${query}"
**Threshold:** ${actualThreshold}
**Filters:** ${[
                category && `Category: ${category}`
              ].filter(Boolean).join(', ') || 'None'}

Try adjusting your search query or using different keywords.`
            }]
          };
        }

        const resultText = results.map((result, index) => {
          const memory = result.memory;
          return `**${index + 1}. Memory ID:** ${memory.id}
**Relevance Score:** ${(result.score * 100).toFixed(1)}%
**Content:** ${memory.content.substring(0, 300)}${memory.content.length > 300 ? '...' : ''}
**Category:** ${memory.category || 'Not specified'}
**Created:** ${new Date(memory.createdAt).toLocaleString()}
**Metadata:** ${Object.keys(memory.metadata).length > 0 ? JSON.stringify(memory.metadata, null, 2) : 'None'}`;
        }).join('\n\n---\n\n');

        return {
          content: [{
            type: 'text' as const,
            text: `🔍 Found ${results.length} memory(ies) matching your search:

**Query:** "${query}"
**Threshold:** ${actualThreshold}
**Filters:** ${[
              category && `Category: ${category}`
            ].filter(Boolean).join(', ') || 'None'}

${resultText}`
          }],
          recommendedNextStep: 'get_memory'
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error searching memories: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  };
}
