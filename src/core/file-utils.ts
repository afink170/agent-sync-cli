import fs from 'fs';
import path from 'path';

import { logger } from '@/core/logger';

/**
 * Recursively searches for directories containing a specific file, starting from the base directory.
 * @param baseDir - The root directory to start the search from.
 * @param fileName - The name of the file to search for.
 * @returns An array of directory paths that contain the specified file.
 */
export function findDirectoriesWithFile(
  baseDir: string,
  fileName: string
): string[] {
  const dirs: string[] = [];

  function walk(dir: string) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);

      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (fs.existsSync(path.join(fullPath, fileName))) {
          logger.debug('Found matching file:', path.join(fullPath, fileName));
          dirs.push(fullPath);
        }

        walk(fullPath);
      }
    }
  }

  if (fs.existsSync(path.join(baseDir, fileName))) {
    dirs.push(baseDir);
  }

  walk(baseDir);

  return dirs;
}

/**
 * Checks if the given path exists and is a directory.
 * @param dirPath - The path to check.
 * @returns True if the path exists and is a directory, false otherwise.
 */
export function directoryExists(dirPath: string): boolean {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}
