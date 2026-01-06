import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { syncSymlink } from '@/core/symlink-manager';
import {
  cleanupTmpDir,
  createFileStructure,
  createTmpDir,
} from '../test-utils/filesystem';

describe('symlink-manager integration tests', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await createTmpDir();
  });

  afterEach(async () => {
    await cleanupTmpDir(tmpDir);
  });

  describe('directory symlinks', () => {
    it('creates symlink when parent directory does not exist', async () => {
      // Create source directory with file
      await createFileStructure(tmpDir, {
        '.agents/rules/test.txt': 'test content',
      });

      // Verify parent directory doesn't exist
      const parentDir = path.join(tmpDir, '.kilocode');
      expect(fsSync.existsSync(parentDir)).toBe(false);

      // Create symlink - this should work even though parent doesn't exist
      syncSymlink(tmpDir, '.agents/rules', '.kilocode/rules', 'directory');

      // Verify symlink was created (use lstatSync which doesn't follow symlinks)
      const targetPath = path.join(tmpDir, '.kilocode', 'rules');
      const stats = fsSync.lstatSync(targetPath);
      expect(stats.isSymbolicLink()).toBe(true);

      // Verify symlink points to correct target
      const linkTarget = fsSync.readlinkSync(targetPath);
      expect(linkTarget).toBe('../.agents/rules');

      // Verify can read through symlink
      const content = await fs.readFile(
        path.join(targetPath, 'test.txt'),
        'utf-8'
      );
      expect(content).toBe('test content');
    });

    it('creates symlink when parent directory exists', async () => {
      // Create source and parent directory
      await createFileStructure(tmpDir, {
        '.agents/rules/test.txt': 'test content',
      });
      await fs.mkdir(path.join(tmpDir, '.claude'), { recursive: true });

      // Create symlink
      syncSymlink(tmpDir, '.agents/rules', '.claude/rules', 'directory');

      // Verify symlink was created
      const targetPath = path.join(tmpDir, '.claude', 'rules');
      const stats = fsSync.lstatSync(targetPath);
      expect(stats.isSymbolicLink()).toBe(true);

      // Verify symlink points to correct target
      const linkTarget = fsSync.readlinkSync(targetPath);
      expect(linkTarget).toBe('../.agents/rules');
    });

    it('handles nested directory creation', async () => {
      // Create source
      await createFileStructure(tmpDir, {
        '.agents/rules/test.txt': 'test content',
      });

      // Create symlink with deeply nested target
      syncSymlink(
        tmpDir,
        '.agents/rules',
        'deeply/nested/path/.claude/rules',
        'directory'
      );

      // Verify parent directories were created
      const targetPath = path.join(
        tmpDir,
        'deeply',
        'nested',
        'path',
        '.claude',
        'rules'
      );
      const stats = fsSync.lstatSync(targetPath);
      expect(stats.isSymbolicLink()).toBe(true);

      // Verify symlink points to correct relative path
      const linkTarget = fsSync.readlinkSync(targetPath);
      expect(linkTarget).toBe('../../../../.agents/rules');
    });

    it('updates incorrect symlink', async () => {
      // Create source and parent directory
      await createFileStructure(tmpDir, {
        '.agents/rules/test.txt': 'test content',
      });
      const parentDir = path.join(tmpDir, '.kilocode');
      await fs.mkdir(parentDir, { recursive: true });

      // Create incorrect symlink
      const targetPath = path.join(tmpDir, '.kilocode', 'rules');
      await fs.symlink('.wrong/target', targetPath, 'dir');

      // Verify incorrect symlink exists
      expect(fsSync.readlinkSync(targetPath)).toBe('.wrong/target');

      // Update symlink
      syncSymlink(tmpDir, '.agents/rules', '.kilocode/rules', 'directory');

      // Verify symlink was updated
      expect(fsSync.readlinkSync(targetPath)).toBe('../.agents/rules');
    });

    it('skips when source does not exist', async () => {
      // Try to create symlink from non-existent source
      syncSymlink(
        tmpDir,
        '.agents/nonexistent',
        '.kilocode/rules',
        'directory'
      );

      // Verify symlink was NOT created
      const targetPath = path.join(tmpDir, '.kilocode', 'rules');
      expect(() => fsSync.lstatSync(targetPath)).toThrow();
    });

    it('skips when symlink is already correct', async () => {
      // Create source and parent directory
      await createFileStructure(tmpDir, {
        '.agents/rules/test.txt': 'test content',
      });
      const parentDir = path.join(tmpDir, '.kilocode');
      await fs.mkdir(parentDir, { recursive: true });

      // Create correct symlink
      const targetPath = path.join(tmpDir, '.kilocode', 'rules');
      await fs.symlink('../.agents/rules', targetPath, 'dir');

      const beforeStat = fsSync.lstatSync(targetPath);

      // Call syncSymlink - should skip
      syncSymlink(tmpDir, '.agents/rules', '.kilocode/rules', 'directory');

      const afterStat = fsSync.lstatSync(targetPath);

      // Verify symlink unchanged (same inode)
      expect(beforeStat.ino).toBe(afterStat.ino);
    });

    it('skips when target exists but is not a symlink', async () => {
      // Create source
      await createFileStructure(tmpDir, {
        '.agents/rules/test.txt': 'test content',
      });

      // Create target as regular directory (not symlink)
      const targetPath = path.join(tmpDir, '.kilocode', 'rules');
      await fs.mkdir(targetPath, { recursive: true });
      await fs.writeFile(
        path.join(targetPath, 'existing.txt'),
        'existing content'
      );

      // Try to create symlink - should skip
      syncSymlink(tmpDir, '.agents/rules', '.kilocode/rules', 'directory');

      // Verify target is still a regular directory
      const stats = fsSync.lstatSync(targetPath);
      expect(stats.isSymbolicLink()).toBe(false);
      expect(stats.isDirectory()).toBe(true);

      // Verify existing file is untouched
      const content = await fs.readFile(
        path.join(targetPath, 'existing.txt'),
        'utf-8'
      );
      expect(content).toBe('existing content');
    });
  });

  describe('file symlinks', () => {
    it('creates file symlink', async () => {
      // Create source file
      await createFileStructure(tmpDir, {
        '.agents/AGENTS.md': 'agent instructions',
      });

      // Create symlink
      syncSymlink(tmpDir, '.agents/AGENTS.md', '.claude/CLAUDE.md', 'file');

      // Verify symlink was created
      const targetPath = path.join(tmpDir, '.claude', 'CLAUDE.md');
      const stats = fsSync.lstatSync(targetPath);
      expect(stats.isSymbolicLink()).toBe(true);

      // Verify can read through symlink
      const content = await fs.readFile(targetPath, 'utf-8');
      expect(content).toBe('agent instructions');

      // Verify symlink points to correct relative path
      const linkTarget = fsSync.readlinkSync(targetPath);
      expect(linkTarget).toBe('../.agents/AGENTS.md');
    });

    it('creates file symlink with nested target', async () => {
      // Create source file
      await createFileStructure(tmpDir, {
        '.agents/AGENTS.md': 'agent instructions',
      });

      // Create symlink with nested target
      syncSymlink(tmpDir, '.agents/AGENTS.md', 'config/docs/AGENTS.md', 'file');

      // Verify symlink was created
      const targetPath = path.join(tmpDir, 'config', 'docs', 'AGENTS.md');
      const stats = fsSync.lstatSync(targetPath);
      expect(stats.isSymbolicLink()).toBe(true);

      // Verify symlink points to correct relative path
      const linkTarget = fsSync.readlinkSync(targetPath);
      expect(linkTarget).toBe('../../.agents/AGENTS.md');
    });

    it('updates incorrect file symlink', async () => {
      // Create source file and parent directory
      await createFileStructure(tmpDir, {
        '.agents/AGENTS.md': 'agent instructions',
      });
      await fs.mkdir(path.join(tmpDir, '.claude'), { recursive: true });

      // Create incorrect symlink
      const targetPath = path.join(tmpDir, '.claude', 'CLAUDE.md');
      await fs.symlink('.wrong/file.md', targetPath, 'file');

      // Verify incorrect symlink exists
      expect(fsSync.readlinkSync(targetPath)).toBe('.wrong/file.md');

      // Update symlink
      syncSymlink(tmpDir, '.agents/AGENTS.md', '.claude/CLAUDE.md', 'file');

      // Verify symlink was updated
      expect(fsSync.readlinkSync(targetPath)).toBe('../.agents/AGENTS.md');
    });
  });

  describe('platform-specific behavior', () => {
    it.skipIf(process.platform === 'win32')(
      'creates Unix-style relative symlinks',
      async () => {
        // Create source
        await createFileStructure(tmpDir, {
          '.agents/rules/test.txt': 'test content',
        });

        // Create symlink
        syncSymlink(tmpDir, '.agents/rules', '.claude/rules', 'directory');

        const targetPath = path.join(tmpDir, '.claude', 'rules');
        const stats = fsSync.lstatSync(targetPath);
        expect(stats.isSymbolicLink()).toBe(true);

        // Unix-specific: verify symlink is relative (not absolute Windows path)
        const linkTarget = fsSync.readlinkSync(targetPath);
        expect(linkTarget).not.toMatch(/^[A-Z]:\\/); // Not absolute Windows path
        expect(linkTarget).toBe('../.agents/rules');
      }
    );
  });

  describe('complex directory structures', () => {
    it('handles multiple nested levels', async () => {
      // Create complex directory structure
      await createFileStructure(tmpDir, {
        'projects/app1/.agents/rules/rule1.md': 'rule 1',
        'projects/app1/.agents/rules/rule2.md': 'rule 2',
        'projects/app1/.agents/skills/skill1.md': 'skill 1',
      });

      // Create multiple symlinks
      const app1Dir = path.join(tmpDir, 'projects', 'app1');
      syncSymlink(app1Dir, '.agents/rules', '.claude/rules', 'directory');
      syncSymlink(app1Dir, '.agents/skills', '.claude/skills', 'directory');

      // Verify both symlinks work
      const rulesPath = path.join(app1Dir, '.claude', 'rules');
      const skillsPath = path.join(app1Dir, '.claude', 'skills');

      expect(fsSync.lstatSync(rulesPath).isSymbolicLink()).toBe(true);
      expect(fsSync.lstatSync(skillsPath).isSymbolicLink()).toBe(true);

      // Verify can read through both symlinks
      const rule1 = await fs.readFile(
        path.join(rulesPath, 'rule1.md'),
        'utf-8'
      );
      const skill1 = await fs.readFile(
        path.join(skillsPath, 'skill1.md'),
        'utf-8'
      );

      expect(rule1).toBe('rule 1');
      expect(skill1).toBe('skill 1');
    });

    it('handles symlinks at various nesting levels', async () => {
      // Create sources at different levels
      await createFileStructure(tmpDir, {
        '.agents/root.md': 'root level',
        'level1/.agents/l1.md': 'level 1',
        'level1/level2/.agents/l2.md': 'level 2',
        'level1/level2/level3/.agents/l3.md': 'level 3',
      });

      // Create symlinks at each level
      syncSymlink(tmpDir, '.agents/root.md', '.claude/root.md', 'file');
      syncSymlink(
        path.join(tmpDir, 'level1'),
        '.agents/l1.md',
        '.claude/l1.md',
        'file'
      );
      syncSymlink(
        path.join(tmpDir, 'level1', 'level2'),
        '.agents/l2.md',
        '.claude/l2.md',
        'file'
      );
      syncSymlink(
        path.join(tmpDir, 'level1', 'level2', 'level3'),
        '.agents/l3.md',
        '.claude/l3.md',
        'file'
      );

      // Verify all symlinks work
      const rootContent = await fs.readFile(
        path.join(tmpDir, '.claude', 'root.md'),
        'utf-8'
      );
      const l1Content = await fs.readFile(
        path.join(tmpDir, 'level1', '.claude', 'l1.md'),
        'utf-8'
      );
      const l2Content = await fs.readFile(
        path.join(tmpDir, 'level1', 'level2', '.claude', 'l2.md'),
        'utf-8'
      );
      const l3Content = await fs.readFile(
        path.join(tmpDir, 'level1', 'level2', 'level3', '.claude', 'l3.md'),
        'utf-8'
      );

      expect(rootContent).toBe('root level');
      expect(l1Content).toBe('level 1');
      expect(l2Content).toBe('level 2');
      expect(l3Content).toBe('level 3');
    });
  });
});
