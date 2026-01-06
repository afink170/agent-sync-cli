import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock globby at module scope
const mockGlobby = vi.fn();
vi.mock('globby', () => ({
  globby: mockGlobby,
}));

// Mock logger
const mockLogger = {
  debug: vi.fn(),
};
vi.mock('@/core/logger', () => ({
  logger: mockLogger,
}));

// Mock fs for directoryExists tests
import { vol } from 'memfs';
import { setupMemfs } from '../test-utils/mocks.js';

vi.mock('node:fs', async () => {
  const memfs: typeof import('memfs') = await vi.importActual('memfs');
  return { default: memfs.fs, ...memfs.fs };
});

describe('file-utils unit tests', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    vol.reset();
  });

  describe('findDirectoriesWithFile', () => {
    it('should return directories containing the specified file', async () => {
      mockGlobby.mockResolvedValue([
        '/project/dir1/AGENTS.md',
        '/project/dir2/AGENTS.md',
      ]);

      const { findDirectoriesWithFile } = await import('@/core/file-utils.js');
      const result = await findDirectoriesWithFile('/project', 'AGENTS.md');

      expect(result).toEqual(['/project/dir1', '/project/dir2']);
      expect(mockGlobby).toHaveBeenCalledWith('**/AGENTS.md', {
        cwd: '/project',
        followSymbolicLinks: false,
        onlyFiles: true,
        absolute: true,
        ignore: ['**/node_modules/**', '**/.git/**'],
      });
    });

    it('should return empty array when no files found', async () => {
      mockGlobby.mockResolvedValue([]);

      const { findDirectoriesWithFile } = await import('@/core/file-utils.js');
      const result = await findDirectoriesWithFile('/project', 'AGENTS.md');

      expect(result).toEqual([]);
    });

    it('should deduplicate directories when multiple files in same directory', async () => {
      // Simulate finding the same directory multiple times (shouldn't happen with globby, but testing the dedupe logic)
      mockGlobby.mockResolvedValue([
        '/project/dir1/AGENTS.md',
        '/project/dir1/other.md', // This would only happen if searching for different pattern
      ]);

      const { findDirectoriesWithFile } = await import('@/core/file-utils.js');
      const result = await findDirectoriesWithFile('/project', '*.md');

      // Should only return dir1 once
      expect(result).toEqual(['/project/dir1']);
    });

    it('should handle nested directory structures', async () => {
      mockGlobby.mockResolvedValue([
        '/project/level1/AGENTS.md',
        '/project/level1/level2/AGENTS.md',
        '/project/level1/level2/level3/AGENTS.md',
      ]);

      const { findDirectoriesWithFile } = await import('@/core/file-utils.js');
      const result = await findDirectoriesWithFile('/project', 'AGENTS.md');

      expect(result).toEqual([
        '/project/level1',
        '/project/level1/level2',
        '/project/level1/level2/level3',
      ]);
    });

    it('should log debug messages for each found file', async () => {
      mockGlobby.mockResolvedValue([
        '/project/dir1/AGENTS.md',
        '/project/dir2/AGENTS.md',
      ]);

      const { findDirectoriesWithFile } = await import('@/core/file-utils.js');
      await findDirectoriesWithFile('/project', 'AGENTS.md');

      expect(mockLogger.debug).toHaveBeenCalledTimes(2);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Found matching file:',
        '/project/dir1/AGENTS.md'
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Found matching file:',
        '/project/dir2/AGENTS.md'
      );
    });

    it('should use correct globby pattern', async () => {
      mockGlobby.mockResolvedValue([]);

      const { findDirectoriesWithFile } = await import('@/core/file-utils.js');
      await findDirectoriesWithFile('/base', 'test.txt');

      expect(mockGlobby).toHaveBeenCalledWith(
        '**/test.txt',
        expect.any(Object)
      );
    });

    it('should configure globby to ignore node_modules and .git', async () => {
      mockGlobby.mockResolvedValue([]);

      const { findDirectoriesWithFile } = await import('@/core/file-utils.js');
      await findDirectoriesWithFile('/project', 'AGENTS.md');

      expect(mockGlobby).toHaveBeenCalledWith('**/AGENTS.md', {
        cwd: '/project',
        followSymbolicLinks: false,
        onlyFiles: true,
        absolute: true,
        ignore: ['**/node_modules/**', '**/.git/**'],
      });
    });

    it('should not follow symlinks', async () => {
      mockGlobby.mockResolvedValue([]);

      const { findDirectoriesWithFile } = await import('@/core/file-utils.js');
      await findDirectoriesWithFile('/project', 'AGENTS.md');

      expect(mockGlobby).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          followSymbolicLinks: false,
        })
      );
    });

    it('should only search for files, not directories', async () => {
      mockGlobby.mockResolvedValue([]);

      const { findDirectoriesWithFile } = await import('@/core/file-utils.js');
      await findDirectoriesWithFile('/project', 'AGENTS.md');

      expect(mockGlobby).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          onlyFiles: true,
        })
      );
    });

    it('should return absolute paths', async () => {
      mockGlobby.mockResolvedValue([]);

      const { findDirectoriesWithFile } = await import('@/core/file-utils.js');
      await findDirectoriesWithFile('/project', 'AGENTS.md');

      expect(mockGlobby).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          absolute: true,
        })
      );
    });

    it('should handle files at different nesting levels', async () => {
      mockGlobby.mockResolvedValue([
        '/project/AGENTS.md',
        '/project/sub/AGENTS.md',
        '/project/sub/deep/nested/AGENTS.md',
      ]);

      const { findDirectoriesWithFile } = await import('@/core/file-utils.js');
      const result = await findDirectoriesWithFile('/project', 'AGENTS.md');

      expect(result).toHaveLength(3);
      expect(result).toContain('/project');
      expect(result).toContain('/project/sub');
      expect(result).toContain('/project/sub/deep/nested');
    });

    it('should handle single file result', async () => {
      mockGlobby.mockResolvedValue(['/project/single/AGENTS.md']);

      const { findDirectoriesWithFile } = await import('@/core/file-utils.js');
      const result = await findDirectoriesWithFile('/project', 'AGENTS.md');

      expect(result).toEqual(['/project/single']);
    });

    it('should handle paths with special characters', async () => {
      mockGlobby.mockResolvedValue([
        '/project/dir-with-dash/AGENTS.md',
        '/project/dir.with.dots/AGENTS.md',
        '/project/dir_with_underscores/AGENTS.md',
      ]);

      const { findDirectoriesWithFile } = await import('@/core/file-utils.js');
      const result = await findDirectoriesWithFile('/project', 'AGENTS.md');

      expect(result).toHaveLength(3);
      expect(result).toContain('/project/dir-with-dash');
      expect(result).toContain('/project/dir.with.dots');
      expect(result).toContain('/project/dir_with_underscores');
    });
  });

  describe('directoryExists', () => {
    setupMemfs();

    it('should return true for existing directory', async () => {
      vol.fromJSON({
        '/project/dir/file.txt': 'content',
      });

      const { directoryExists } = await import('@/core/file-utils.js');
      const result = directoryExists('/project/dir');

      expect(result).toBe(true);
    });

    it('should return false for non-existent path', async () => {
      const { directoryExists } = await import('@/core/file-utils.js');
      const result = directoryExists('/nonexistent/path');

      expect(result).toBe(false);
    });

    it('should return false for file path (not directory)', async () => {
      vol.fromJSON({
        '/project/file.txt': 'content',
      });

      const { directoryExists } = await import('@/core/file-utils.js');
      const result = directoryExists('/project/file.txt');

      expect(result).toBe(false);
    });

    it('should return true for root directory', async () => {
      vol.fromJSON({
        '/project/file.txt': 'content',
      });

      const { directoryExists } = await import('@/core/file-utils.js');
      const result = directoryExists('/project');

      expect(result).toBe(true);
    });

    it('should return true for nested directory', async () => {
      vol.fromJSON({
        '/project/level1/level2/level3/file.txt': 'content',
      });

      const { directoryExists } = await import('@/core/file-utils.js');
      const result = directoryExists('/project/level1/level2/level3');

      expect(result).toBe(true);
    });

    it('should return false for path with trailing slash that does not exist', async () => {
      const { directoryExists } = await import('@/core/file-utils.js');
      const result = directoryExists('/nonexistent/');

      expect(result).toBe(false);
    });

    it('should handle symlink to directory', async () => {
      vol.fromJSON({
        '/project/real-dir/file.txt': 'content',
      });
      vol.symlinkSync('/project/real-dir', '/project/symlink-dir', 'dir');

      const { directoryExists } = await import('@/core/file-utils.js');
      const result = directoryExists('/project/symlink-dir');

      // symlink to directory should be recognized as directory by statSync
      expect(result).toBe(true);
    });

    it('should return false for symlink to file', async () => {
      vol.fromJSON({
        '/project/file.txt': 'content',
      });
      vol.symlinkSync('/project/file.txt', '/project/symlink.txt', 'file');

      const { directoryExists } = await import('@/core/file-utils.js');
      const result = directoryExists('/project/symlink.txt');

      expect(result).toBe(false);
    });

    it('should return false for broken symlink', async () => {
      // Create parent directory first, then create symlink to nonexistent target
      vol.mkdirSync('/project', { recursive: true });
      vol.symlinkSync('/nonexistent/target', '/project/broken-link', 'dir');

      const { directoryExists } = await import('@/core/file-utils.js');
      const result = directoryExists('/project/broken-link');

      expect(result).toBe(false);
    });

    it('should handle empty directory', async () => {
      vol.mkdirSync('/project/empty', { recursive: true });

      const { directoryExists } = await import('@/core/file-utils.js');
      const result = directoryExists('/project/empty');

      expect(result).toBe(true);
    });

    it('should return true for directory with only subdirectories', async () => {
      vol.mkdirSync('/project/parent/child', { recursive: true });

      const { directoryExists } = await import('@/core/file-utils.js');
      const result = directoryExists('/project/parent');

      expect(result).toBe(true);
    });

    it('should handle paths with dots in directory names', async () => {
      vol.fromJSON({
        '/project/.hidden/file.txt': 'content',
      });

      const { directoryExists } = await import('@/core/file-utils.js');
      const result = directoryExists('/project/.hidden');

      expect(result).toBe(true);
    });

    it('should handle paths with special characters', async () => {
      vol.fromJSON({
        '/project/dir-with-dash/file.txt': 'content',
      });

      const { directoryExists } = await import('@/core/file-utils.js');
      const result = directoryExists('/project/dir-with-dash');

      expect(result).toBe(true);
    });
  });
});
