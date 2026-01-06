import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { directoryExists, findDirectoriesWithFile } from '@/core/file-utils';
import {
  cleanupTmpDir,
  createFileStructure,
  createTmpDir,
} from '../test-utils/filesystem';

describe('file-utils integration tests', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await createTmpDir();
  });

  afterEach(async () => {
    await cleanupTmpDir(tmpDir);
  });

  describe('findDirectoriesWithFile', () => {
    it('finds single directory with file', async () => {
      await createFileStructure(tmpDir, {
        'project/AGENTS.md': 'agent instructions',
      });

      const dirs = await findDirectoriesWithFile(tmpDir, 'AGENTS.md');

      expect(dirs).toHaveLength(1);
      expect(dirs[0]).toBe(path.join(tmpDir, 'project'));
    });

    it('finds multiple directories with the same file', async () => {
      await createFileStructure(tmpDir, {
        'project1/AGENTS.md': 'project 1 agents',
        'project2/AGENTS.md': 'project 2 agents',
        'project3/AGENTS.md': 'project 3 agents',
      });

      const dirs = await findDirectoriesWithFile(tmpDir, 'AGENTS.md');

      expect(dirs).toHaveLength(3);
      expect(dirs).toContain(path.join(tmpDir, 'project1'));
      expect(dirs).toContain(path.join(tmpDir, 'project2'));
      expect(dirs).toContain(path.join(tmpDir, 'project3'));
    });

    it('finds files in nested directory structures', async () => {
      await createFileStructure(tmpDir, {
        'root/AGENTS.md': 'root agents',
        'level1/AGENTS.md': 'level 1 agents',
        'level1/level2/AGENTS.md': 'level 2 agents',
        'level1/level2/level3/AGENTS.md': 'level 3 agents',
      });

      const dirs = await findDirectoriesWithFile(tmpDir, 'AGENTS.md');

      expect(dirs).toHaveLength(4);
      expect(dirs).toContain(path.join(tmpDir, 'root'));
      expect(dirs).toContain(path.join(tmpDir, 'level1'));
      expect(dirs).toContain(path.join(tmpDir, 'level1', 'level2'));
      expect(dirs).toContain(path.join(tmpDir, 'level1', 'level2', 'level3'));
    });

    it('returns empty array when file not found', async () => {
      await createFileStructure(tmpDir, {
        'project/other-file.md': 'other content',
      });

      const dirs = await findDirectoriesWithFile(tmpDir, 'AGENTS.md');

      expect(dirs).toEqual([]);
    });

    it('ignores node_modules directories', async () => {
      await createFileStructure(tmpDir, {
        'root/AGENTS.md': 'root agents',
        'node_modules/package/AGENTS.md': 'should be ignored',
        'project/node_modules/lib/AGENTS.md': 'should also be ignored',
      });

      const dirs = await findDirectoriesWithFile(tmpDir, 'AGENTS.md');

      expect(dirs).toHaveLength(1);
      expect(dirs[0]).toBe(path.join(tmpDir, 'root'));
    });

    it('ignores .git directories', async () => {
      await createFileStructure(tmpDir, {
        'root/AGENTS.md': 'root agents',
        '.git/hooks/AGENTS.md': 'should be ignored',
        'submodule/.git/config/AGENTS.md': 'should also be ignored',
      });

      const dirs = await findDirectoriesWithFile(tmpDir, 'AGENTS.md');

      expect(dirs).toHaveLength(1);
      expect(dirs[0]).toBe(path.join(tmpDir, 'root'));
    });

    it('handles complex directory structures', async () => {
      await createFileStructure(tmpDir, {
        'root/AGENTS.md': 'root',
        'apps/app1/AGENTS.md': 'app1',
        'apps/app2/AGENTS.md': 'app2',
        'packages/pkg1/AGENTS.md': 'pkg1',
        'packages/pkg2/AGENTS.md': 'pkg2',
        'packages/pkg2/nested/AGENTS.md': 'pkg2 nested',
        'tools/scripts/AGENTS.md': 'tools/scripts',
      });

      const dirs = await findDirectoriesWithFile(tmpDir, 'AGENTS.md');

      // Should find 7 directories
      expect(dirs).toHaveLength(7);
      expect(dirs).toContain(path.join(tmpDir, 'root'));
      expect(dirs).toContain(path.join(tmpDir, 'apps', 'app1'));
      expect(dirs).toContain(path.join(tmpDir, 'apps', 'app2'));
      expect(dirs).toContain(path.join(tmpDir, 'packages', 'pkg1'));
      expect(dirs).toContain(path.join(tmpDir, 'packages', 'pkg2'));
      expect(dirs).toContain(path.join(tmpDir, 'packages', 'pkg2', 'nested'));
      expect(dirs).toContain(path.join(tmpDir, 'tools', 'scripts'));
    });

    it('handles files with same name in different contexts', async () => {
      await createFileStructure(tmpDir, {
        'README.md': 'root readme',
        'project1/README.md': 'project 1 readme',
        'project1/docs/README.md': 'project 1 docs readme',
        'project2/README.md': 'project 2 readme',
      });

      const dirs = await findDirectoriesWithFile(tmpDir, 'README.md');

      expect(dirs).toHaveLength(4);
      expect(dirs).toContain(tmpDir);
      expect(dirs).toContain(path.join(tmpDir, 'project1'));
      expect(dirs).toContain(path.join(tmpDir, 'project1', 'docs'));
      expect(dirs).toContain(path.join(tmpDir, 'project2'));
    });

    it('does not follow symlinks to avoid cycles', async () => {
      // Create source directory with file
      await createFileStructure(tmpDir, {
        'source/AGENTS.md': 'source agents',
      });

      // Create a symlink that could create a cycle
      const targetPath = path.join(tmpDir, 'link-to-source');
      const sourcePath = path.join(tmpDir, 'source');
      await fs.symlink(sourcePath, targetPath, 'dir');

      const dirs = await findDirectoriesWithFile(tmpDir, 'AGENTS.md');

      // Should find only the original, not through the symlink
      expect(dirs).toHaveLength(1);
      expect(dirs[0]).toBe(path.join(tmpDir, 'source'));
    });

    it('handles empty directory gracefully', async () => {
      // tmpDir exists but is empty
      const dirs = await findDirectoriesWithFile(tmpDir, 'AGENTS.md');

      expect(dirs).toEqual([]);
    });

    it('finds files with different extensions', async () => {
      await createFileStructure(tmpDir, {
        'project1/config.json': '{}',
        'project2/config.json': '{}',
        'project3/config.yaml': 'config: true',
      });

      const jsonDirs = await findDirectoriesWithFile(tmpDir, 'config.json');
      const yamlDirs = await findDirectoriesWithFile(tmpDir, 'config.yaml');

      expect(jsonDirs).toHaveLength(2);
      expect(yamlDirs).toHaveLength(1);
      expect(yamlDirs[0]).toBe(path.join(tmpDir, 'project3'));
    });
  });

  describe('findDirectoriesWithFile performance', () => {
    it('handles large directory trees efficiently', async () => {
      // Create a realistic monorepo structure
      const files: Record<string, string> = {};

      // Create 20 packages, each with AGENTS.md
      for (let i = 1; i <= 20; i++) {
        files[`packages/package-${i}/AGENTS.md`] = `package ${i}`;
        files[`packages/package-${i}/src/index.ts`] = `export default {}`;
        files[`packages/package-${i}/test/index.test.ts`] = `test`;
      }

      // Create some apps
      for (let i = 1; i <= 5; i++) {
        files[`apps/app-${i}/AGENTS.md`] = `app ${i}`;
        files[`apps/app-${i}/src/main.ts`] = `main`;
      }

      await createFileStructure(tmpDir, files);

      const startTime = Date.now();
      const dirs = await findDirectoriesWithFile(tmpDir, 'AGENTS.md');
      const duration = Date.now() - startTime;

      // Should find all 25 directories
      expect(dirs).toHaveLength(25);

      // Should complete reasonably quickly (under 5 seconds even on slow systems)
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('directoryExists', () => {
    it('returns true for existing directory', async () => {
      await createFileStructure(tmpDir, {
        '.agents/AGENTS.md': 'content',
      });

      const exists = directoryExists(path.join(tmpDir, '.agents'));

      expect(exists).toBe(true);
    });

    it('returns false for non-existent directory', () => {
      const exists = directoryExists(path.join(tmpDir, 'nonexistent'));

      expect(exists).toBe(false);
    });

    it('returns false for file (not directory)', async () => {
      await createFileStructure(tmpDir, {
        'file.txt': 'content',
      });

      const exists = directoryExists(path.join(tmpDir, 'file.txt'));

      expect(exists).toBe(false);
    });

    it('returns true for nested directory', async () => {
      await createFileStructure(tmpDir, {
        'level1/level2/level3/file.txt': 'content',
      });

      const exists = directoryExists(
        path.join(tmpDir, 'level1', 'level2', 'level3')
      );

      expect(exists).toBe(true);
    });

    it('returns false for symlink to file', async () => {
      await createFileStructure(tmpDir, {
        'source.txt': 'content',
      });

      const linkPath = path.join(tmpDir, 'link.txt');
      await fs.symlink(path.join(tmpDir, 'source.txt'), linkPath, 'file');

      const exists = directoryExists(linkPath);

      // lstat follows symlinks, so this should return false since target is a file
      expect(exists).toBe(false);
    });

    it('returns true for symlink to directory', async () => {
      await createFileStructure(tmpDir, {
        'source/file.txt': 'content',
      });

      const linkPath = path.join(tmpDir, 'link-dir');
      await fs.symlink(path.join(tmpDir, 'source'), linkPath, 'dir');

      const exists = directoryExists(linkPath);

      // statSync follows symlinks, so this should return true
      expect(exists).toBe(true);
    });

    it('handles absolute paths', () => {
      const absolutePath = path.resolve(tmpDir);
      const exists = directoryExists(absolutePath);

      expect(exists).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles special characters in file names', async () => {
      await createFileStructure(tmpDir, {
        'proj1/file with spaces.md': 'content',
        'special/file-with-dashes.md': 'content',
        'symbols/file_with_underscores.md': 'content',
      });

      const spaceDirs = await findDirectoriesWithFile(
        tmpDir,
        'file with spaces.md'
      );
      const dashDirs = await findDirectoriesWithFile(
        tmpDir,
        'file-with-dashes.md'
      );
      const underscoreDirs = await findDirectoriesWithFile(
        tmpDir,
        'file_with_underscores.md'
      );

      expect(spaceDirs).toHaveLength(1);
      expect(dashDirs).toHaveLength(1);
      expect(underscoreDirs).toHaveLength(1);
    });

    it('handles deeply nested paths', async () => {
      // Create a very deep directory structure
      const deepPath = 'a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/AGENTS.md';
      await createFileStructure(tmpDir, {
        [deepPath]: 'deep content',
      });

      const dirs = await findDirectoriesWithFile(tmpDir, 'AGENTS.md');

      expect(dirs).toHaveLength(1);
      expect(dirs[0]).toBe(
        path.join(tmpDir, 'a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p')
      );
    });

    it('handles case-sensitive file names', async () => {
      // Note: This test may behave differently on case-insensitive filesystems
      await createFileStructure(tmpDir, {
        'upper/AGENTS.md': 'uppercase',
        'lower/agents.md': 'lowercase',
      });

      const upperDirs = await findDirectoriesWithFile(tmpDir, 'AGENTS.md');
      const lowerDirs = await findDirectoriesWithFile(tmpDir, 'agents.md');

      // On case-sensitive filesystems, these should be different
      // On case-insensitive filesystems, they might be the same
      expect(upperDirs.length).toBeGreaterThanOrEqual(1);
      expect(lowerDirs.length).toBeGreaterThanOrEqual(1);
    });
  });
});
