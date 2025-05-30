import { homedir } from 'os';
import { join } from 'path';

/**
 * Configuration for storage directory resolution
 */
export interface StorageConfig {
  /** Whether to use global user directory instead of project-specific directories */
  useGlobalDirectory: boolean;
}

/**
 * Parse command-line arguments to determine storage configuration
 */
export function parseCommandLineArgs(): StorageConfig {
  const args = process.argv.slice(2);
  const useGlobalDirectory = args.includes('--claude');
  
  return {
    useGlobalDirectory
  };
}

/**
 * Get the global storage directory path
 * - Windows: C:\Users\{username}\.agentic-tools-mcp\
 * - macOS/Linux: ~/.agentic-tools-mcp/
 */
export function getGlobalStorageDirectory(): string {
  const userHome = homedir();
  return join(userHome, '.agentic-tools-mcp');
}

/**
 * Resolve the actual working directory based on configuration
 *
 * @param providedPath - The working directory path provided by the user (optional when using global directory)
 * @param config - Storage configuration including global directory flag
 * @returns The actual working directory to use for storage
 */
export function resolveWorkingDirectory(providedPath: string | undefined, config: StorageConfig): string {
  if (config.useGlobalDirectory) {
    return getGlobalStorageDirectory();
  }

  if (!providedPath) {
    throw new Error('workingDirectory is required when not using --claude flag');
  }

  return providedPath;
}

/**
 * Get parameter description for workingDirectory based on configuration
 */
export function getWorkingDirectoryDescription(config: StorageConfig): string {
  if (config.useGlobalDirectory) {
    return 'This parameter is ignored when using --claude flag. Global directory is used automatically.';
  }

  return 'The full absolute path to the working directory where data is stored. MUST be an absolute path, never relative. Windows: "C:\\Users\\username\\project" or "D:\\projects\\my-app". Unix/Linux/macOS: "/home/username/project" or "/Users/username/project". Do NOT use: ".", "..", "~", "./folder", "../folder" or any relative paths. Ensure the path exists and is accessible before calling this tool.';
}

/**
 * Check if workingDirectory parameter should be optional based on configuration
 */
export function isWorkingDirectoryOptional(config: StorageConfig): boolean {
  return config.useGlobalDirectory;
}
