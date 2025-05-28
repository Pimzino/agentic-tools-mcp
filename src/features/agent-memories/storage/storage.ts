import { Memory, SearchMemoryInput, MemorySearchResult } from '../models/memory.js';

/**
 * Storage interface for the agent memories system
 */
export interface MemoryStorage {
  /**
   * Initialize the storage system
   */
  initialize(): Promise<void>;

  /**
   * Get all memories with optional filtering
   * @param agentId - Optional agent identifier filter
   * @param category - Optional category filter
   * @param limit - Optional limit on number of results
   * @returns Promise resolving to array of memories
   */
  getMemories(agentId?: string, category?: string, limit?: number): Promise<Memory[]>;

  /**
   * Get a specific memory by ID
   * @param id - Memory identifier
   * @returns Promise resolving to memory or null if not found
   */
  getMemory(id: string): Promise<Memory | null>;

  /**
   * Create a new memory
   * @param memory - Memory object to create
   * @returns Promise resolving to created memory
   */
  createMemory(memory: Memory): Promise<Memory>;

  /**
   * Update an existing memory
   * @param id - Memory identifier
   * @param updates - Partial memory object with updates
   * @returns Promise resolving to updated memory or null if not found
   */
  updateMemory(id: string, updates: Partial<Memory>): Promise<Memory | null>;

  /**
   * Delete a memory
   * @param id - Memory identifier
   * @returns Promise resolving to true if deleted, false if not found
   */
  deleteMemory(id: string): Promise<boolean>;

  /**
   * Search memories by semantic similarity
   * @param input - Search input parameters
   * @returns Promise resolving to array of search results with scores
   */
  searchMemories(input: SearchMemoryInput): Promise<MemorySearchResult[]>;

  /**
   * Delete all memories for a specific agent
   * @param agentId - Agent identifier
   * @returns Promise resolving to number of deleted memories
   */
  deleteMemoriesByAgent(agentId: string): Promise<number>;

  /**
   * Get memory statistics
   * @returns Promise resolving to statistics object
   */
  getStatistics(): Promise<{
    totalMemories: number;
    memoriesByAgent: Record<string, number>;
    memoriesByCategory: Record<string, number>;
    oldestMemory?: string;
    newestMemory?: string;
  }>;
}
