import fs from 'fs';
import { globby } from 'globby';
import path from 'path';

import { logger } from '@/core/logger';

/**
 * Recursively searches for directories containing a specific file, starting from the base directory.
 * Uses globby for robust, performant directory traversal with proper symlink handling.
 * @param baseDir - The root directory to start the search from.
 * @param fileName - The name of the file to search for.
 * @returns A promise that resolves to an array of directory paths that contain the specified file.
 */
export async function findDirectoriesWithFile(
  baseDir: string,
  fileName: string
): Promise<string[]> {
  // Find all instances of the file using globby
  const files = await globby(`**/${fileName}`, {
    cwd: baseDir,
    followSymbolicLinks: false, // Don't follow symlinks to avoid cycles
    onlyFiles: true,
    absolute: true,
    ignore: ['**/node_modules/**', '**/.git/**'],
  });

  // Extract unique directory paths
  const dirs = [...new Set(files.map((file) => path.dirname(file)))];

  // Log found files for debugging
  for (const file of files) {
    logger.debug('Found matching file:', file);
  }

  return dirs;
}

/**
 * Checks if the given absolute path exists and is a directory.
 * @param dirPath - The path to check.
 * @returns True if the path exists and is a directory, false otherwise.
 */
export function directoryExists(dirPath: string): boolean {
  try {
    if (!path.isAbsolute(dirPath)) {
      throw new Error('Relative path not supported in directoryExists');
    }
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}
