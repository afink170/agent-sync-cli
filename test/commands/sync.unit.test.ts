import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTmpBaseDir } from '../test-utils/filesystem';

// Mock all dependencies at module scope
const mockFindDirectoriesWithFile = vi.fn();
const mockSyncSymlink = vi.fn();
const mockLoggerInfo = vi.fn();

vi.mock('@/core/file-utils', () => ({
  findDirectoriesWithFile: mockFindDirectoriesWithFile,
}));

vi.mock('@/core/symlink-manager', () => ({
  syncSymlink: mockSyncSymlink,
}));

vi.mock('@/core/logger', () => ({
  logger: {
    info: mockLoggerInfo,
  },
}));

const baseDir = getTmpBaseDir();

describe('sync command unit tests', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    mockFindDirectoriesWithFile.mockResolvedValue([]);
  });

  describe('rule filtering', () => {
    it('should process only enabled rules by default', async () => {
      const { syncCommand } = await import('@/commands/sync.js');
      await syncCommand({
        ctx: {
          config: {
            rules: [
              {
                name: 'enabled-rule',
                source: '.agents',
                target: '.claude',
                recursive: false,
                type: 'directory',
                enabled: true,
              },
              {
                name: 'disabled-rule',
                source: 'other',
                target: 'target',
                recursive: false,
                type: 'file',
                enabled: false,
              },
            ],
          },
        },
        input: {
          cwd: baseDir,
          dryRun: false,
          verbose: false,
        },
      });

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Processing rule: enabled-rule'
      );
      expect(mockLoggerInfo).not.toHaveBeenCalledWith(
        'Processing rule: disabled-rule'
      );
      expect(mockSyncSymlink).toHaveBeenCalledTimes(1);
    });

    it('should process specific rule when --rule option provided', async () => {
      const { syncCommand } = await import('@/commands/sync.js');
      await syncCommand({
        ctx: {
          config: {
            rules: [
              {
                name: 'rule-1',
                source: '.agents',
                target: '.claude',
                recursive: false,
                type: 'directory',
                enabled: true,
              },
              {
                name: 'rule-2',
                source: 'other',
                target: 'target',
                recursive: false,
                type: 'file',
                enabled: true,
              },
            ],
          },
        },
        input: {
          cwd: baseDir,
          dryRun: false,
          verbose: false,
          rule: 'rule-2',
        },
      });

      expect(mockLoggerInfo).toHaveBeenCalledWith('Processing rule: rule-2');
      expect(mockLoggerInfo).not.toHaveBeenCalledWith(
        'Processing rule: rule-1'
      );
      expect(mockSyncSymlink).toHaveBeenCalledTimes(1);
    });

    it('should process disabled rule when specifically requested via --rule', async () => {
      const { syncCommand } = await import('@/commands/sync.js');
      await syncCommand({
        ctx: {
          config: {
            rules: [
              {
                name: 'disabled-rule',
                source: '.agents',
                target: '.claude',
                recursive: false,
                type: 'directory',
                enabled: false,
              },
            ],
          },
        },
        input: {
          cwd: baseDir,
          dryRun: false,
          verbose: false,
          rule: 'disabled-rule',
        },
      });

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Processing rule: disabled-rule'
      );
      expect(mockSyncSymlink).toHaveBeenCalledTimes(1);
    });

    it('should process no rules when none match filter', async () => {
      const { syncCommand } = await import('@/commands/sync.js');
      await syncCommand({
        ctx: {
          config: {
            rules: [
              {
                name: 'rule-1',
                source: '.agents',
                target: '.claude',
                recursive: false,
                type: 'directory',
                enabled: true,
              },
            ],
          },
        },
        input: {
          cwd: baseDir,
          dryRun: false,
          verbose: false,
          rule: 'nonexistent-rule',
        },
      });

      expect(mockLoggerInfo).not.toHaveBeenCalledWith(
        expect.stringContaining('Processing rule')
      );
      expect(mockSyncSymlink).not.toHaveBeenCalled();
    });

    it('should process all enabled rules when no filter specified', async () => {
      const { syncCommand } = await import('@/commands/sync.js');
      await syncCommand({
        ctx: {
          config: {
            rules: [
              {
                name: 'rule-1',
                source: '.agents',
                target: '.claude',
                recursive: false,
                type: 'directory',
                enabled: true,
              },
              {
                name: 'rule-2',
                source: 'other',
                target: 'target',
                recursive: false,
                type: 'file',
                enabled: true,
              },
              {
                name: 'disabled',
                source: 'disabled',
                target: 'disabled',
                recursive: false,
                type: 'file',
                enabled: false,
              },
            ],
          },
        },
        input: {
          cwd: baseDir,
          dryRun: false,
          verbose: false,
        },
      });

      expect(mockLoggerInfo).toHaveBeenCalledWith('Processing rule: rule-1');
      expect(mockLoggerInfo).toHaveBeenCalledWith('Processing rule: rule-2');
      expect(mockLoggerInfo).not.toHaveBeenCalledWith(
        'Processing rule: disabled'
      );
      expect(mockSyncSymlink).toHaveBeenCalledTimes(2);
    });
  });

  describe('non-recursive sync', () => {
    it('should sync once from cwd for non-recursive rules', async () => {
      const { syncCommand } = await import('@/commands/sync.js');
      await syncCommand({
        ctx: {
          config: {
            rules: [
              {
                name: 'non-recursive',
                source: '.agents',
                target: '.claude',
                recursive: false,
                type: 'directory',
                enabled: true,
              },
            ],
          },
        },
        input: {
          cwd: baseDir,
          dryRun: false,
          verbose: false,
        },
      });

      expect(mockFindDirectoriesWithFile).not.toHaveBeenCalled();
      expect(mockSyncSymlink).toHaveBeenCalledWith(
        baseDir,
        '.agents',
        '.claude',
        'directory'
      );
      expect(mockSyncSymlink).toHaveBeenCalledTimes(1);
    });

    it('should sync non-recursive file rule', async () => {
      const { syncCommand } = await import('@/commands/sync.js');
      await syncCommand({
        ctx: {
          config: {
            rules: [
              {
                name: 'file-rule',
                source: 'AGENTS.md',
                target: 'CLAUDE.md',
                recursive: false,
                type: 'file',
                enabled: true,
              },
            ],
          },
        },
        input: {
          cwd: baseDir,
          dryRun: false,
          verbose: false,
        },
      });

      expect(mockSyncSymlink).toHaveBeenCalledWith(
        baseDir,
        'AGENTS.md',
        'CLAUDE.md',
        'file'
      );
    });

    it('should sync to multiple targets for non-recursive rule', async () => {
      const { syncCommand } = await import('@/commands/sync.js');
      await syncCommand({
        ctx: {
          config: {
            rules: [
              {
                name: 'multi-target',
                source: '.agents',
                target: ['.claude', '.cursor'],
                recursive: false,
                type: 'directory',
                enabled: true,
              },
            ],
          },
        },
        input: {
          cwd: baseDir,
          dryRun: false,
          verbose: false,
        },
      });

      expect(mockSyncSymlink).toHaveBeenCalledWith(
        baseDir,
        '.agents',
        '.claude',
        'directory'
      );
      expect(mockSyncSymlink).toHaveBeenCalledWith(
        baseDir,
        '.agents',
        '.cursor',
        'directory'
      );
      expect(mockSyncSymlink).toHaveBeenCalledTimes(2);
    });
  });

  describe('recursive sync', () => {
    it('should find directories and sync for recursive file rules', async () => {
      mockFindDirectoriesWithFile.mockResolvedValue([
        '/project/dir1',
        '/project/dir2',
      ]);

      const { syncCommand } = await import('@/commands/sync.js');
      await syncCommand({
        ctx: {
          config: {
            rules: [
              {
                name: 'recursive-file',
                source: 'AGENTS.md',
                target: 'CLAUDE.md',
                recursive: true,
                type: 'file',
                enabled: true,
              },
            ],
          },
        },
        input: {
          cwd: baseDir,
          dryRun: false,
          verbose: false,
        },
      });

      expect(mockFindDirectoriesWithFile).toHaveBeenCalledWith(
        baseDir,
        'AGENTS.md'
      );
      expect(mockSyncSymlink).toHaveBeenCalledWith(
        '/project/dir1',
        'AGENTS.md',
        'CLAUDE.md',
        'file'
      );
      expect(mockSyncSymlink).toHaveBeenCalledWith(
        '/project/dir2',
        'AGENTS.md',
        'CLAUDE.md',
        'file'
      );
      expect(mockSyncSymlink).toHaveBeenCalledTimes(2);
    });

    it('should sync to multiple targets in each found directory for recursive rules', async () => {
      mockFindDirectoriesWithFile.mockResolvedValue(['/project/dir1']);

      const { syncCommand } = await import('@/commands/sync.js');
      await syncCommand({
        ctx: {
          config: {
            rules: [
              {
                name: 'recursive-multi-target',
                source: 'AGENTS.md',
                target: ['CLAUDE.md', 'CURSOR.md'],
                recursive: true,
                type: 'file',
                enabled: true,
              },
            ],
          },
        },
        input: {
          cwd: baseDir,
          dryRun: false,
          verbose: false,
        },
      });

      expect(mockSyncSymlink).toHaveBeenCalledWith(
        '/project/dir1',
        'AGENTS.md',
        'CLAUDE.md',
        'file'
      );
      expect(mockSyncSymlink).toHaveBeenCalledWith(
        '/project/dir1',
        'AGENTS.md',
        'CURSOR.md',
        'file'
      );
      expect(mockSyncSymlink).toHaveBeenCalledTimes(2);
    });

    it('should not sync when no directories found for recursive file rule', async () => {
      mockFindDirectoriesWithFile.mockResolvedValue([]);

      const { syncCommand } = await import('@/commands/sync.js');
      await syncCommand({
        ctx: {
          config: {
            rules: [
              {
                name: 'recursive-file',
                source: 'AGENTS.md',
                target: 'CLAUDE.md',
                recursive: true,
                type: 'file',
                enabled: true,
              },
            ],
          },
        },
        input: {
          cwd: baseDir,
          dryRun: false,
          verbose: false,
        },
      });

      expect(mockFindDirectoriesWithFile).toHaveBeenCalled();
      expect(mockSyncSymlink).not.toHaveBeenCalled();
    });

    it('should not use recursive search for directory rules even if recursive is true', async () => {
      const { syncCommand } = await import('@/commands/sync.js');
      await syncCommand({
        ctx: {
          config: {
            rules: [
              {
                name: 'recursive-dir',
                source: '.agents',
                target: '.claude',
                recursive: true,
                type: 'directory',
                enabled: true,
              },
            ],
          },
        },
        input: {
          cwd: baseDir,
          dryRun: false,
          verbose: false,
        },
      });

      expect(mockFindDirectoriesWithFile).not.toHaveBeenCalled();
      expect(mockSyncSymlink).toHaveBeenCalledWith(
        baseDir,
        '.agents',
        '.claude',
        'directory'
      );
    });
  });

  describe('complex scenarios', () => {
    it('should handle multiple recursive file rules', async () => {
      mockFindDirectoriesWithFile
        .mockResolvedValueOnce(['/project/dir1'])
        .mockResolvedValueOnce(['/project/dir2']);

      const { syncCommand } = await import('@/commands/sync.js');
      await syncCommand({
        ctx: {
          config: {
            rules: [
              {
                name: 'rule-1',
                source: 'AGENTS.md',
                target: 'CLAUDE.md',
                recursive: true,
                type: 'file',
                enabled: true,
              },
              {
                name: 'rule-2',
                source: 'other.txt',
                target: 'target.txt',
                recursive: true,
                type: 'file',
                enabled: true,
              },
            ],
          },
        },
        input: {
          cwd: baseDir,
          dryRun: false,
          verbose: false,
        },
      });

      expect(mockFindDirectoriesWithFile).toHaveBeenCalledWith(
        baseDir,
        'AGENTS.md'
      );
      expect(mockFindDirectoriesWithFile).toHaveBeenCalledWith(
        baseDir,
        'other.txt'
      );
      expect(mockSyncSymlink).toHaveBeenCalledTimes(2);
    });

    it('should handle mixed rule types', async () => {
      mockFindDirectoriesWithFile.mockResolvedValue(['/project/dir1']);

      const { syncCommand } = await import('@/commands/sync.js');
      await syncCommand({
        ctx: {
          config: {
            rules: [
              {
                name: 'recursive-file',
                source: 'AGENTS.md',
                target: 'CLAUDE.md',
                recursive: true,
                type: 'file',
                enabled: true,
              },
              {
                name: 'non-recursive-dir',
                source: '.agents',
                target: '.claude',
                recursive: false,
                type: 'directory',
                enabled: true,
              },
            ],
          },
        },
        input: {
          cwd: baseDir,
          dryRun: false,
          verbose: false,
        },
      });

      expect(mockFindDirectoriesWithFile).toHaveBeenCalledTimes(1);
      expect(mockSyncSymlink).toHaveBeenCalledWith(
        '/project/dir1',
        'AGENTS.md',
        'CLAUDE.md',
        'file'
      );
      expect(mockSyncSymlink).toHaveBeenCalledWith(
        baseDir,
        '.agents',
        '.claude',
        'directory'
      );
      expect(mockSyncSymlink).toHaveBeenCalledTimes(2);
    });

    it('should handle recursive rule with multiple directories and multiple targets', async () => {
      mockFindDirectoriesWithFile.mockResolvedValue([
        '/project/dir1',
        '/project/dir2',
        '/project/dir3',
      ]);

      const { syncCommand } = await import('@/commands/sync.js');
      await syncCommand({
        ctx: {
          config: {
            rules: [
              {
                name: 'complex-rule',
                source: 'AGENTS.md',
                target: ['CLAUDE.md', 'CURSOR.md', 'OTHER.md'],
                recursive: true,
                type: 'file',
                enabled: true,
              },
            ],
          },
        },
        input: {
          cwd: baseDir,
          dryRun: false,
          verbose: false,
        },
      });

      // Should call syncSymlink 3 directories × 3 targets = 9 times
      expect(mockSyncSymlink).toHaveBeenCalledTimes(9);

      // Verify all combinations are called
      expect(mockSyncSymlink).toHaveBeenCalledWith(
        '/project/dir1',
        'AGENTS.md',
        'CLAUDE.md',
        'file'
      );
      expect(mockSyncSymlink).toHaveBeenCalledWith(
        '/project/dir1',
        'AGENTS.md',
        'CURSOR.md',
        'file'
      );
      expect(mockSyncSymlink).toHaveBeenCalledWith(
        '/project/dir1',
        'AGENTS.md',
        'OTHER.md',
        'file'
      );
      expect(mockSyncSymlink).toHaveBeenCalledWith(
        '/project/dir2',
        'AGENTS.md',
        'CLAUDE.md',
        'file'
      );
    });

    it('should process empty config without errors', async () => {
      const { syncCommand } = await import('@/commands/sync.js');
      await syncCommand({
        ctx: {
          config: {
            rules: [],
          },
        },
        input: {
          cwd: baseDir,
          dryRun: false,
          verbose: false,
        },
      });

      expect(mockSyncSymlink).not.toHaveBeenCalled();
      expect(mockFindDirectoriesWithFile).not.toHaveBeenCalled();
    });
  });

  describe('target array handling', () => {
    it('should handle single target as string', async () => {
      const { syncCommand } = await import('@/commands/sync.js');
      await syncCommand({
        ctx: {
          config: {
            rules: [
              {
                name: 'single-target',
                source: '.agents',
                target: '.claude',
                recursive: false,
                type: 'directory',
                enabled: true,
              },
            ],
          },
        },
        input: {
          cwd: baseDir,
          dryRun: false,
          verbose: false,
        },
      });

      expect(mockSyncSymlink).toHaveBeenCalledWith(
        baseDir,
        '.agents',
        '.claude',
        'directory'
      );
      expect(mockSyncSymlink).toHaveBeenCalledTimes(1);
    });

    it('should handle single target in array', async () => {
      const { syncCommand } = await import('@/commands/sync.js');
      await syncCommand({
        ctx: {
          config: {
            rules: [
              {
                name: 'array-single-target',
                source: '.agents',
                target: ['.claude'],
                recursive: false,
                type: 'directory',
                enabled: true,
              },
            ],
          },
        },
        input: {
          cwd: baseDir,
          dryRun: false,
          verbose: false,
        },
      });

      expect(mockSyncSymlink).toHaveBeenCalledWith(
        baseDir,
        '.agents',
        '.claude',
        'directory'
      );
      expect(mockSyncSymlink).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple targets in array', async () => {
      const { syncCommand } = await import('@/commands/sync.js');
      await syncCommand({
        ctx: {
          config: {
            rules: [
              {
                name: 'multi-target',
                source: '.agents',
                target: ['.claude', '.cursor', '.windsurf'],
                recursive: false,
                type: 'directory',
                enabled: true,
              },
            ],
          },
        },
        input: {
          cwd: baseDir,
          dryRun: false,
          verbose: false,
        },
      });

      expect(mockSyncSymlink).toHaveBeenCalledWith(
        baseDir,
        '.agents',
        '.claude',
        'directory'
      );
      expect(mockSyncSymlink).toHaveBeenCalledWith(
        baseDir,
        '.agents',
        '.cursor',
        'directory'
      );
      expect(mockSyncSymlink).toHaveBeenCalledWith(
        baseDir,
        '.agents',
        '.windsurf',
        'directory'
      );
      expect(mockSyncSymlink).toHaveBeenCalledTimes(3);
    });
  });
});
