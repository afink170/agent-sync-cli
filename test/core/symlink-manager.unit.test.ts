import { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setupMemfs } from '../test-utils/mocks.js';

// Mock node:fs with memfs at module scope
vi.mock('node:fs', async () => {
  const memfs: typeof import('memfs') = await vi.importActual('memfs');
  return { default: memfs.fs, ...memfs.fs };
});

// Mock logger to capture log calls
const mockLogger = {
  dryRun: false,
  debug: vi.fn(),
  action: vi.fn(),
  warn: vi.fn(),
};

vi.mock('@/core/logger', () => ({
  logger: mockLogger,
  Logger: {
    dryRun: false,
  },
}));

describe('symlink-manager unit tests', () => {
  setupMemfs();

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    mockLogger.dryRun = false;
  });

  describe('source validation', () => {
    it('should skip when source does not exist', async () => {
      // No source file created
      const { syncSymlink } = await import('@/core/symlink-manager.js');

      syncSymlink('/project', '.agents/rules', '.claude/rules', 'directory');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('does not exist')
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('/project/.agents/rules')
      );

      // Verify no symlink created
      expect(() => vol.lstatSync('/project/.claude/rules')).toThrow();
    });

    it('should skip when source file does not exist', async () => {
      const { syncSymlink } = await import('@/core/symlink-manager.js');

      syncSymlink('/project', 'AGENTS.md', 'CLAUDE.md', 'file');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('does not exist')
      );

      // Verify no symlink created
      expect(() => vol.lstatSync('/project/CLAUDE.md')).toThrow();
    });

    it('should proceed when source exists', async () => {
      vol.fromJSON({
        '/project/.agents/rules/test.md': 'content',
      });

      const { syncSymlink } = await import('@/core/symlink-manager.js');

      syncSymlink('/project', '.agents/rules', '.claude/rules', 'directory');

      expect(mockLogger.warn).not.toHaveBeenCalledWith(
        expect.stringContaining('does not exist')
      );
    });
  });

  describe('relative path calculation', () => {
    it('should create symlink with correct relative path for sibling directories', async () => {
      vol.fromJSON({
        '/project/.agents/rules/test.md': 'content',
      });

      const { syncSymlink } = await import('@/core/symlink-manager.js');

      syncSymlink('/project', '.agents/rules', '.claude/rules', 'directory');

      const stats = vol.lstatSync('/project/.claude/rules');
      expect(stats.isSymbolicLink()).toBe(true);

      const target = vol.readlinkSync('/project/.claude/rules');
      expect(target).toBe('../.agents/rules');
    });

    it('should create symlink with correct relative path for nested target', async () => {
      vol.fromJSON({
        '/project/.agents/rules/test.md': 'content',
      });

      const { syncSymlink } = await import('@/core/symlink-manager.js');

      syncSymlink(
        '/project',
        '.agents/rules',
        'deeply/nested/.claude/rules',
        'directory'
      );

      const target = vol.readlinkSync('/project/deeply/nested/.claude/rules');
      expect(target).toBe('../../../.agents/rules');
    });

    it('should create symlink with correct relative path for file', async () => {
      vol.fromJSON({
        '/project/.agents/AGENTS.md': 'agent instructions',
      });

      const { syncSymlink } = await import('@/core/symlink-manager.js');

      syncSymlink('/project', '.agents/AGENTS.md', '.claude/CLAUDE.md', 'file');

      const target = vol.readlinkSync('/project/.claude/CLAUDE.md');
      expect(target).toBe('../.agents/AGENTS.md');
    });

    it('should create symlink with correct relative path when source is in root', async () => {
      vol.fromJSON({
        '/project/AGENTS.md': 'content',
      });

      const { syncSymlink } = await import('@/core/symlink-manager.js');

      syncSymlink('/project', 'AGENTS.md', '.claude/CLAUDE.md', 'file');

      const target = vol.readlinkSync('/project/.claude/CLAUDE.md');
      expect(target).toBe('../AGENTS.md');
    });
  });

  describe('symlink creation', () => {
    it('should create new symlink when target does not exist', async () => {
      vol.fromJSON({
        '/project/.agents/rules/test.md': 'content',
      });

      const { syncSymlink } = await import('@/core/symlink-manager.js');

      syncSymlink('/project', '.agents/rules', '.claude/rules', 'directory');

      expect(mockLogger.action).toHaveBeenCalledWith(
        expect.stringContaining('Creating symlink')
      );

      const stats = vol.lstatSync('/project/.claude/rules');
      expect(stats.isSymbolicLink()).toBe(true);
    });

    it('should create parent directories if they do not exist', async () => {
      vol.fromJSON({
        '/project/.agents/test.md': 'content',
      });

      const { syncSymlink } = await import('@/core/symlink-manager.js');

      syncSymlink(
        '/project',
        '.agents',
        'deeply/nested/path/.claude',
        'directory'
      );

      // Verify parent directories were created
      expect(vol.existsSync('/project/deeply')).toBe(true);
      expect(vol.existsSync('/project/deeply/nested')).toBe(true);
      expect(vol.existsSync('/project/deeply/nested/path')).toBe(true);

      const stats = vol.lstatSync('/project/deeply/nested/path/.claude');
      expect(stats.isSymbolicLink()).toBe(true);
    });

    it('should use correct symlink type for directory', async () => {
      vol.fromJSON({
        '/project/.agents/rules/test.md': 'content',
      });

      const { syncSymlink } = await import('@/core/symlink-manager.js');

      syncSymlink('/project', '.agents/rules', '.claude/rules', 'directory');

      const stats = vol.lstatSync('/project/.claude/rules');
      expect(stats.isSymbolicLink()).toBe(true);
    });

    it('should use correct symlink type for file', async () => {
      vol.fromJSON({
        '/project/AGENTS.md': 'content',
      });

      const { syncSymlink } = await import('@/core/symlink-manager.js');

      syncSymlink('/project', 'AGENTS.md', 'CLAUDE.md', 'file');

      const stats = vol.lstatSync('/project/CLAUDE.md');
      expect(stats.isSymbolicLink()).toBe(true);
    });
  });

  describe('symlink update logic', () => {
    it('should skip if symlink already exists and is correct', async () => {
      vol.fromJSON({
        '/project/.agents/rules/test.md': 'content',
      });

      // Create correct symlink manually
      vol.mkdirSync('/project/.claude', { recursive: true });
      vol.symlinkSync('../.agents/rules', '/project/.claude/rules', 'dir');

      const { syncSymlink } = await import('@/core/symlink-manager.js');

      syncSymlink('/project', '.agents/rules', '.claude/rules', 'directory');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('already correct')
      );
      expect(mockLogger.action).not.toHaveBeenCalledWith(
        expect.stringContaining('Creating symlink')
      );
    });

    it('should update symlink if it points to wrong target', async () => {
      vol.fromJSON({
        '/project/.agents/rules/test.md': 'content',
      });

      // Create incorrect symlink
      vol.mkdirSync('/project/.claude', { recursive: true });
      vol.symlinkSync('.wrong/target', '/project/.claude/rules', 'dir');

      const { syncSymlink } = await import('@/core/symlink-manager.js');

      syncSymlink('/project', '.agents/rules', '.claude/rules', 'directory');

      expect(mockLogger.action).toHaveBeenCalledWith(
        expect.stringContaining('Removing incorrect symlink')
      );
      expect(mockLogger.action).toHaveBeenCalledWith(
        expect.stringContaining('.wrong/target')
      );

      // Verify symlink was updated
      const target = vol.readlinkSync('/project/.claude/rules');
      expect(target).toBe('../.agents/rules');
    });

    it('should skip if target exists but is not a symlink', async () => {
      vol.fromJSON({
        '/project/.agents/rules/test.md': 'content',
        '/project/.claude/rules/existing.md': 'existing file',
      });

      const { syncSymlink } = await import('@/core/symlink-manager.js');

      syncSymlink('/project', '.agents/rules', '.claude/rules', 'directory');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('exists but is not a symlink')
      );

      // Verify target was not modified
      const stats = vol.lstatSync('/project/.claude/rules');
      expect(stats.isDirectory()).toBe(true);
      expect(stats.isSymbolicLink()).toBe(false);
    });

    it('should detect incorrect symlink with absolute path', async () => {
      vol.fromJSON({
        '/project/.agents/rules/test.md': 'content',
      });

      // Create symlink with absolute path (incorrect)
      vol.mkdirSync('/project/.claude', { recursive: true });
      vol.symlinkSync(
        '/project/.agents/rules',
        '/project/.claude/rules',
        'dir'
      );

      const { syncSymlink } = await import('@/core/symlink-manager.js');

      syncSymlink('/project', '.agents/rules', '.claude/rules', 'directory');

      // Should detect as incorrect and update
      expect(mockLogger.action).toHaveBeenCalledWith(
        expect.stringContaining('Removing incorrect symlink')
      );

      const target = vol.readlinkSync('/project/.claude/rules');
      expect(target).toBe('../.agents/rules');
    });
  });

  describe('dry-run mode', () => {
    it('should not create symlink in dry-run mode', async () => {
      vol.fromJSON({
        '/project/.agents/rules/test.md': 'content',
      });

      mockLogger.dryRun = true;
      const { syncSymlink } = await import('@/core/symlink-manager.js');

      syncSymlink('/project', '.agents/rules', '.claude/rules', 'directory');

      expect(mockLogger.action).toHaveBeenCalledWith(
        expect.stringContaining('Creating symlink')
      );

      // Verify no symlink was actually created
      expect(() => vol.lstatSync('/project/.claude/rules')).toThrow();
    });

    it('should not remove incorrect symlink in dry-run mode', async () => {
      vol.fromJSON({
        '/project/.agents/rules/test.md': 'content',
      });

      // Create incorrect symlink
      vol.mkdirSync('/project/.claude', { recursive: true });
      vol.symlinkSync('.wrong/target', '/project/.claude/rules', 'dir');

      mockLogger.dryRun = true;
      const { syncSymlink } = await import('@/core/symlink-manager.js');

      syncSymlink('/project', '.agents/rules', '.claude/rules', 'directory');

      expect(mockLogger.action).toHaveBeenCalledWith(
        expect.stringContaining('Removing incorrect symlink')
      );

      // Verify symlink was not actually removed
      const target = vol.readlinkSync('/project/.claude/rules');
      expect(target).toBe('.wrong/target');
    });

    it('should not create parent directories in dry-run mode', async () => {
      vol.fromJSON({
        '/project/.agents/test.md': 'content',
      });

      mockLogger.dryRun = true;
      const { syncSymlink } = await import('@/core/symlink-manager.js');

      syncSymlink(
        '/project',
        '.agents',
        'deeply/nested/path/.claude',
        'directory'
      );

      expect(mockLogger.action).toHaveBeenCalledWith(
        expect.stringContaining('Creating symlink')
      );

      // Verify directories were not created
      expect(vol.existsSync('/project/deeply')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle symlink at root level', async () => {
      vol.fromJSON({
        '/project/.agents/test.md': 'content',
      });

      const { syncSymlink } = await import('@/core/symlink-manager.js');

      syncSymlink('/project', '.agents', '.claude', 'directory');

      const target = vol.readlinkSync('/project/.claude');
      expect(target).toBe('.agents');
    });

    it('should handle source and target in same directory', async () => {
      vol.fromJSON({
        '/project/source.md': 'content',
      });

      const { syncSymlink } = await import('@/core/symlink-manager.js');

      syncSymlink('/project', 'source.md', 'target.md', 'file');

      const target = vol.readlinkSync('/project/target.md');
      expect(target).toBe('source.md');
    });

    it('should handle multiple levels of nesting in source', async () => {
      vol.fromJSON({
        '/project/deeply/nested/source/file.md': 'content',
      });

      const { syncSymlink } = await import('@/core/symlink-manager.js');

      syncSymlink(
        '/project',
        'deeply/nested/source',
        '.claude/rules',
        'directory'
      );

      const target = vol.readlinkSync('/project/.claude/rules');
      expect(target).toBe('../deeply/nested/source');
    });

    it('should handle paths with dots in directory names', async () => {
      vol.fromJSON({
        '/project/.agents.backup/rules/test.md': 'content',
      });

      const { syncSymlink } = await import('@/core/symlink-manager.js');

      syncSymlink(
        '/project',
        '.agents.backup/rules',
        '.claude/rules',
        'directory'
      );

      const target = vol.readlinkSync('/project/.claude/rules');
      expect(target).toBe('../.agents.backup/rules');
    });
  });

  describe('logging behavior', () => {
    it('should log action when creating symlink', async () => {
      vol.fromJSON({
        '/project/.agents/test.md': 'content',
      });

      const { syncSymlink } = await import('@/core/symlink-manager.js');

      syncSymlink('/project', '.agents', '.claude', 'directory');

      expect(mockLogger.action).toHaveBeenCalledWith(
        expect.stringContaining('Creating symlink')
      );
      expect(mockLogger.action).toHaveBeenCalledWith(
        expect.stringContaining('/project/.claude')
      );
      expect(mockLogger.action).toHaveBeenCalledWith(
        expect.stringContaining('.agents')
      );
    });

    it('should log debug when symlink is already correct', async () => {
      vol.fromJSON({
        '/project/.agents/test.md': 'content',
      });

      // Create symlink - .claude is the symlink itself, not a parent directory
      vol.symlinkSync('.agents', '/project/.claude', 'dir');

      const { syncSymlink } = await import('@/core/symlink-manager.js');

      syncSymlink('/project', '.agents', '.claude', 'directory');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('already correct')
      );
    });

    it('should log warning when source does not exist', async () => {
      const { syncSymlink } = await import('@/core/symlink-manager.js');

      syncSymlink('/project', '.agents', '.claude', 'directory');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('does not exist')
      );
    });

    it('should log warning when target exists but is not a symlink', async () => {
      vol.fromJSON({
        '/project/.agents/test.md': 'content',
        '/project/.claude/file.md': 'existing',
      });

      const { syncSymlink } = await import('@/core/symlink-manager.js');

      syncSymlink('/project', '.agents', '.claude', 'directory');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('exists but is not a symlink')
      );
    });
  });
});
