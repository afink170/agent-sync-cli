import fs from 'fs';
import path from 'path';

import { logger } from '@/core/logger';

/**
 * Creates or updates a symlink from target to source within the specified directory.
 * Performs validation checks and handles existing symlinks appropriately.
 * @param dir - The base directory where the symlink should be created
 * @param source - The relative path to the source file/directory
 * @param target - The relative path where the symlink should be created
 * @param type - The type of symlink ('file' or 'directory')
 */
export function syncSymlink(
  dir: string,
  source: string,
  target: string,
  type: 'file' | 'directory'
) {
  const targetPath = path.join(dir, target);

  const sourcePath = path.join(dir, source);

  const linkType = type === 'directory' ? 'dir' : 'file';

  // Check if source exists

  if (!fs.existsSync(sourcePath)) {
    logger.warn(`Source ${sourcePath} does not exist, skipping`);

    return;
  }

  // Check if target exists (use lstatSync to detect symlinks without following them)

  let targetExists = false;
  let stat: fs.Stats | undefined;
  try {
    stat = fs.lstatSync(targetPath);
    targetExists = true;
  } catch {
    // Target doesn't exist, which is fine
  }

  if (targetExists && stat) {
    if (stat.isSymbolicLink()) {
      const currentLink = fs.readlinkSync(targetPath);

      if (currentLink === source) {
        logger.debug(`Symlink ${targetPath} already correct`);

        return;
      } else {
        logger.action(
          `Removing incorrect symlink ${targetPath} -> ${currentLink}`
        );

        if (!logger.dryRun) {
          fs.unlinkSync(targetPath);
        }
      }
    } else {
      logger.warn(`Target ${targetPath} exists but is not a symlink, skipping`);

      return;
    }
  }

  // Create symlink

  logger.action(`Creating symlink ${targetPath} -> ${source}`);

  if (!logger.dryRun) {
    // Ensure parent directory exists
    const parentDir = path.dirname(targetPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.symlinkSync(source, targetPath, linkType);
  }
}
