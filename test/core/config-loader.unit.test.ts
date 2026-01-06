import { cosmiconfig } from 'cosmiconfig';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getTmpBaseDir } from '../test-utils/filesystem.js';
import { createMockCosmiconfig } from '../test-utils/mocks.js';

// Mock cosmiconfig at module scope
vi.mock('cosmiconfig', () => ({
  cosmiconfig: vi.fn(),
}));

// Mock logger to prevent console output during tests
vi.mock('@/core/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

const baseDir = getTmpBaseDir();

describe('config-loader unit tests', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('valid configurations', () => {
    it('should load valid config with all required fields', async () => {
      const validConfig = {
        rules: [
          {
            name: 'test-rule',
            source: '.agents/rules',
            target: '.claude/rules',
            recursive: false,
            type: 'directory' as const,
            enabled: true,
          },
        ],
      };

      const mockExplorer = createMockCosmiconfig(validConfig);
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer);

      const { loadConfig } = await import('@/core/config-loader.js');
      const result = await loadConfig(undefined, baseDir);

      expect(result).toEqual(validConfig);
      expect(result.rules).toHaveLength(1);
      expect(result.rules[0].name).toBe('test-rule');
    });

    it('should load config with multiple rules', async () => {
      const multiRuleConfig = {
        rules: [
          {
            name: 'rule-1',
            source: '.agents/rules',
            target: '.claude/rules',
            recursive: true,
            type: 'directory' as const,
            enabled: true,
          },
          {
            name: 'rule-2',
            source: 'AGENTS.md',
            target: 'CLAUDE.md',
            recursive: false,
            type: 'file' as const,
            enabled: false,
          },
        ],
      };

      const mockExplorer = createMockCosmiconfig(multiRuleConfig);
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer);

      const { loadConfig } = await import('@/core/config-loader.js');
      const result = await loadConfig(undefined, baseDir);

      expect(result.rules).toHaveLength(2);
      expect(result.rules[0].name).toBe('rule-1');
      expect(result.rules[1].name).toBe('rule-2');
    });

    it('should load config with multiple targets as array', async () => {
      const multiTargetConfig = {
        rules: [
          {
            name: 'multi-target',
            source: '.agents/rules',
            target: ['.claude/rules', '.cursorrules'],
            recursive: false,
            type: 'directory' as const,
            enabled: true,
          },
        ],
      };

      const mockExplorer = createMockCosmiconfig(multiTargetConfig);
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer);

      const { loadConfig } = await import('@/core/config-loader.js');
      const result = await loadConfig(undefined, baseDir);

      expect(result.rules[0].target).toEqual(['.claude/rules', '.cursorrules']);
    });

    it('should load config with optional description field', async () => {
      const configWithDescription = {
        rules: [
          {
            name: 'described-rule',
            description: 'This is a test rule',
            source: '.agents',
            target: '.claude',
            recursive: false,
            type: 'directory' as const,
            enabled: true,
          },
        ],
      };

      const mockExplorer = createMockCosmiconfig(configWithDescription);
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer);

      const { loadConfig } = await import('@/core/config-loader.js');
      const result = await loadConfig(undefined, baseDir);

      expect(result.rules[0].description).toBe('This is a test rule');
    });

    it('should load config with both file and directory types', async () => {
      const mixedTypeConfig = {
        rules: [
          {
            name: 'file-rule',
            source: 'AGENTS.md',
            target: 'CLAUDE.md',
            recursive: false,
            type: 'file' as const,
            enabled: true,
          },
          {
            name: 'dir-rule',
            source: '.agents/skills',
            target: '.claude/skills',
            recursive: true,
            type: 'directory' as const,
            enabled: true,
          },
        ],
      };

      const mockExplorer = createMockCosmiconfig(mixedTypeConfig);
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer);

      const { loadConfig } = await import('@/core/config-loader.js');
      const result = await loadConfig(undefined, baseDir);

      expect(result.rules[0].type).toBe('file');
      expect(result.rules[1].type).toBe('directory');
    });

    it('should load empty config with no rules', async () => {
      const emptyConfig = { rules: [] };

      const mockExplorer = createMockCosmiconfig(emptyConfig);
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer);

      const { loadConfig } = await import('@/core/config-loader.js');
      const result = await loadConfig(undefined, baseDir);

      expect(result.rules).toEqual([]);
    });
  });

  describe('config not found', () => {
    it('should return empty rules array when no config file found', async () => {
      const mockExplorer = createMockCosmiconfig(null);
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer);

      const { loadConfig } = await import('@/core/config-loader.js');
      const result = await loadConfig(undefined, baseDir);

      expect(result.rules).toEqual([]);
    });

    it('should handle search returning null', async () => {
      const mockExplorer = {
        search: vi.fn().mockResolvedValue(null),
        load: vi.fn(),
        clearCaches: vi.fn(),
        clearLoadCache: vi.fn(),
        clearSearchCache: vi.fn(),
      };
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer);

      const { loadConfig } = await import('@/core/config-loader.js');
      const result = await loadConfig(undefined, baseDir);

      expect(result.rules).toEqual([]);
    });
  });

  describe('invalid configurations', () => {
    it('should reject config with missing required field: name', async () => {
      const invalidConfig = {
        rules: [
          {
            // missing name
            source: '.agents',
            target: '.claude',
            recursive: false,
            type: 'directory',
            enabled: true,
          },
        ],
      };

      const mockExplorer = createMockCosmiconfig(invalidConfig);
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer);

      const { loadConfig } = await import('@/core/config-loader.js');

      await expect(loadConfig(undefined, baseDir)).rejects.toThrow(
        'Invalid config'
      );
    });

    it('should reject config with missing required field: source', async () => {
      const invalidConfig = {
        rules: [
          {
            name: 'test',
            // missing source
            target: '.claude',
            recursive: false,
            type: 'directory',
            enabled: true,
          },
        ],
      };

      const mockExplorer = createMockCosmiconfig(invalidConfig);
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer);

      const { loadConfig } = await import('@/core/config-loader.js');

      await expect(loadConfig(undefined, baseDir)).rejects.toThrow(
        'Invalid config'
      );
    });

    it('should reject config with missing required field: target', async () => {
      const invalidConfig = {
        rules: [
          {
            name: 'test',
            source: '.agents',
            // missing target
            recursive: false,
            type: 'directory',
            enabled: true,
          },
        ],
      };

      const mockExplorer = createMockCosmiconfig(invalidConfig);
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer);

      const { loadConfig } = await import('@/core/config-loader.js');

      await expect(loadConfig(undefined, baseDir)).rejects.toThrow(
        'Invalid config'
      );
    });

    it('should reject config with missing required field: recursive', async () => {
      const invalidConfig = {
        rules: [
          {
            name: 'test',
            source: '.agents',
            target: '.claude',
            // missing recursive
            type: 'directory',
            enabled: true,
          },
        ],
      };

      const mockExplorer = createMockCosmiconfig(invalidConfig);
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer);

      const { loadConfig } = await import('@/core/config-loader.js');

      await expect(loadConfig(undefined, baseDir)).rejects.toThrow(
        'Invalid config'
      );
    });

    it('should reject config with missing required field: type', async () => {
      const invalidConfig = {
        rules: [
          {
            name: 'test',
            source: '.agents',
            target: '.claude',
            recursive: false,
            // missing type
            enabled: true,
          },
        ],
      };

      const mockExplorer = createMockCosmiconfig(invalidConfig);
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer);

      const { loadConfig } = await import('@/core/config-loader.js');

      await expect(loadConfig(undefined, baseDir)).rejects.toThrow(
        'Invalid config'
      );
    });

    it('should reject config with missing required field: enabled', async () => {
      const invalidConfig = {
        rules: [
          {
            name: 'test',
            source: '.agents',
            target: '.claude',
            recursive: false,
            type: 'directory',
            // missing enabled
          },
        ],
      };

      const mockExplorer = createMockCosmiconfig(invalidConfig);
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer);

      const { loadConfig } = await import('@/core/config-loader.js');

      await expect(loadConfig(undefined, baseDir)).rejects.toThrow(
        'Invalid config'
      );
    });

    it('should reject config with invalid type for name (number instead of string)', async () => {
      const invalidConfig = {
        rules: [
          {
            name: 123,
            source: '.agents',
            target: '.claude',
            recursive: false,
            type: 'directory',
            enabled: true,
          },
        ],
      };

      const mockExplorer = createMockCosmiconfig(invalidConfig);
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer);

      const { loadConfig } = await import('@/core/config-loader.js');

      await expect(loadConfig(undefined, baseDir)).rejects.toThrow(
        'Invalid config'
      );
    });

    it('should reject config with invalid type for recursive (string instead of boolean)', async () => {
      const invalidConfig = {
        rules: [
          {
            name: 'test',
            source: '.agents',
            target: '.claude',
            recursive: 'true',
            type: 'directory',
            enabled: true,
          },
        ],
      };

      const mockExplorer = createMockCosmiconfig(invalidConfig);
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer);

      const { loadConfig } = await import('@/core/config-loader.js');

      await expect(loadConfig(undefined, baseDir)).rejects.toThrow(
        'Invalid config'
      );
    });

    it('should reject config with invalid enum value for type', async () => {
      const invalidConfig = {
        rules: [
          {
            name: 'test',
            source: '.agents',
            target: '.claude',
            recursive: false,
            type: 'invalid-type',
            enabled: true,
          },
        ],
      };

      const mockExplorer = createMockCosmiconfig(invalidConfig);
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer);

      const { loadConfig } = await import('@/core/config-loader.js');

      await expect(loadConfig(undefined, baseDir)).rejects.toThrow(
        'Invalid config'
      );
    });

    it('should reject config with empty string for target', async () => {
      const invalidConfig = {
        rules: [
          {
            name: 'test',
            source: '.agents',
            target: '',
            recursive: false,
            type: 'directory',
            enabled: true,
          },
        ],
      };

      const mockExplorer = createMockCosmiconfig(invalidConfig);
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer);

      const { loadConfig } = await import('@/core/config-loader.js');

      await expect(loadConfig(undefined, baseDir)).rejects.toThrow(
        'Invalid config'
      );
    });

    it('should reject config with empty array for target', async () => {
      const invalidConfig = {
        rules: [
          {
            name: 'test',
            source: '.agents',
            target: [],
            recursive: false,
            type: 'directory',
            enabled: true,
          },
        ],
      };

      const mockExplorer = createMockCosmiconfig(invalidConfig);
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer);

      const { loadConfig } = await import('@/core/config-loader.js');

      await expect(loadConfig(undefined, baseDir)).rejects.toThrow(
        'Invalid config'
      );
    });

    it('should reject config with rules as non-array', async () => {
      const invalidConfig = {
        rules: 'not-an-array',
      };

      const mockExplorer = createMockCosmiconfig(invalidConfig);
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer);

      const { loadConfig } = await import('@/core/config-loader.js');

      await expect(loadConfig(undefined, baseDir)).rejects.toThrow(
        'Invalid config'
      );
    });

    it('should reject config with missing rules field', async () => {
      const invalidConfig = {};

      const mockExplorer = createMockCosmiconfig(invalidConfig);
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer);

      const { loadConfig } = await import('@/core/config-loader.js');

      await expect(loadConfig(undefined, baseDir)).rejects.toThrow(
        'Invalid config'
      );
    });
  });

  describe('config path handling', () => {
    it('should use search when no config path provided', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        config: { rules: [] },
        filepath: '/project/.agentsyncrc.json',
      });

      const mockExplorer = {
        search: mockSearch,
        load: vi.fn(),
        clearCaches: vi.fn(),
        clearLoadCache: vi.fn(),
        clearSearchCache: vi.fn(),
      };
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer);

      const { loadConfig } = await import('@/core/config-loader.js');
      await loadConfig(undefined, baseDir);

      expect(mockSearch).toHaveBeenCalledWith(baseDir);
      expect(mockExplorer.load).not.toHaveBeenCalled();
    });

    it('should use load when config path is provided', async () => {
      const mockLoad = vi.fn().mockResolvedValue({
        config: { rules: [] },
        filepath: '/custom/path/config.json',
      });

      const mockExplorer = {
        search: vi.fn(),
        load: mockLoad,
        clearCaches: vi.fn(),
        clearLoadCache: vi.fn(),
        clearSearchCache: vi.fn(),
      };
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer);

      const { loadConfig } = await import('@/core/config-loader.js');
      await loadConfig('/custom/path/config.json', baseDir);

      expect(mockLoad).toHaveBeenCalled();
      expect(mockExplorer.search).not.toHaveBeenCalled();
    });
  });
});
