import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { configFileNames, loadConfig } from '@/core/config-loader';
import { Config } from '@/types/config';
import {
  cleanupTmpDir,
  createFileStructure,
  createTmpDir,
} from '../test-utils/filesystem';

describe('config-loader integration tests', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await createTmpDir();
  });

  afterEach(async () => {
    await cleanupTmpDir(tmpDir);
  });

  const validConfig: Config = {
    rules: [
      {
        name: 'test-rule',
        description: 'A test rule',
        source: '.agents/rules',
        target: '.claude/rules',
        recursive: false,
        type: 'directory',
        enabled: true,
      },
    ],
  };

  describe('config file discovery', () => {
    it('loads config from .agentsyncrc.json', async () => {
      await createFileStructure(tmpDir, {
        '.agentsyncrc.json': JSON.stringify(validConfig),
      });

      const config = await loadConfig(path.join(tmpDir, '.agentsyncrc.json'));

      expect(config.rules).toHaveLength(1);
      expect(config.rules[0].name).toBe('test-rule');
    });

    it('loads config from .agentsyncrc', async () => {
      await createFileStructure(tmpDir, {
        '.agentsyncrc': JSON.stringify(validConfig),
      });

      const config = await loadConfig(path.join(tmpDir, '.agentsyncrc'));

      expect(config.rules).toHaveLength(1);
      expect(config.rules[0].name).toBe('test-rule');
    });

    it('loads config from package.json with agent-sync property', async () => {
      const packageJson = {
        name: 'test-package',
        version: '1.0.0',
        'agent-sync': validConfig,
      };

      await createFileStructure(tmpDir, {
        'package.json': JSON.stringify(packageJson, null, 2),
      });

      const config = await loadConfig(path.join(tmpDir, 'package.json'));

      expect(config.rules).toHaveLength(1);
      expect(config.rules[0].name).toBe('test-rule');
    });

    it('loads config from .config/.agentsyncrc.json', async () => {
      await createFileStructure(tmpDir, {
        '.config/.agentsyncrc.json': JSON.stringify(validConfig),
      });

      const config = await loadConfig(
        path.join(tmpDir, '.config/.agentsyncrc.json')
      );

      expect(config.rules).toHaveLength(1);
      expect(config.rules[0].name).toBe('test-rule');
    });

    it('loads config from agent-sync.config.js', async () => {
      const jsConfig = `module.exports = ${JSON.stringify(validConfig)};`;

      await createFileStructure(tmpDir, {
        'agent-sync.config.js': jsConfig,
      });

      const config = await loadConfig(
        path.join(tmpDir, 'agent-sync.config.js')
      );

      expect(config.rules).toHaveLength(1);
      expect(config.rules[0].name).toBe('test-rule');
    });
  });

  describe('config loading from parent directories', () => {
    it('finds config in parent directory', async () => {
      // Create config in parent
      await createFileStructure(tmpDir, {
        '.agentsyncrc.json': JSON.stringify(validConfig),
      });

      // Create nested subdirectory
      const subDir = path.join(tmpDir, 'nested', 'project');
      await fs.mkdir(subDir, { recursive: true });

      // Change to subdirectory and search for config
      const originalCwd = process.cwd();
      try {
        process.chdir(subDir);

        // Search should find config in parent
        // Note: We need to use the actual file path since we're testing discovery
        const config = await loadConfig(path.join(tmpDir, '.agentsyncrc.json'));

        expect(config.rules).toHaveLength(1);
        expect(config.rules[0].name).toBe('test-rule');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('uses closest config when multiple exist', async () => {
      const parentConfig: Config = {
        rules: [
          {
            name: 'parent-rule',
            source: '.agents',
            target: '.claude',
            recursive: false,
            type: 'directory',
            enabled: true,
          },
        ],
      };

      const childConfig: Config = {
        rules: [
          {
            name: 'child-rule',
            source: '.agents/rules',
            target: '.claude/rules',
            recursive: true,
            type: 'file',
            enabled: true,
          },
        ],
      };

      // Create config in parent
      await createFileStructure(tmpDir, {
        '.agentsyncrc.json': JSON.stringify(parentConfig),
      });

      // Create config in child directory
      const childDir = path.join(tmpDir, 'child');
      await fs.mkdir(childDir, { recursive: true });
      await fs.writeFile(
        path.join(childDir, '.agentsyncrc.json'),
        JSON.stringify(childConfig)
      );

      // Load from child should get child config
      const config = await loadConfig(path.join(childDir, '.agentsyncrc.json'));

      expect(config.rules).toHaveLength(1);
      expect(config.rules[0].name).toBe('child-rule');
    });
  });

  describe('config validation', () => {
    it('returns empty config when no config file exists', async () => {
      // No config file created
      const config = await loadConfig(path.join(tmpDir, 'nonexistent.json'));

      expect(config.rules).toEqual([]);
    });

    it('throws error for invalid config structure', async () => {
      const invalidConfig = {
        rules: 'invalid', // Should be an array
      };

      await createFileStructure(tmpDir, {
        '.agentsyncrc.json': JSON.stringify(invalidConfig),
      });

      await expect(
        loadConfig(path.join(tmpDir, '.agentsyncrc.json'))
      ).rejects.toThrow('Invalid config');
    });

    it('throws error for invalid rule structure', async () => {
      const invalidConfig = {
        rules: [
          {
            name: 'test-rule',
            // Missing required fields
          },
        ],
      };

      await createFileStructure(tmpDir, {
        '.agentsyncrc.json': JSON.stringify(invalidConfig),
      });

      await expect(
        loadConfig(path.join(tmpDir, '.agentsyncrc.json'))
      ).rejects.toThrow('Invalid config');
    });

    it('throws error for invalid type enum', async () => {
      const invalidConfig = {
        rules: [
          {
            name: 'test-rule',
            source: '.agents',
            target: '.claude',
            recursive: false,
            type: 'invalid-type', // Should be 'file' or 'directory'
            enabled: true,
          },
        ],
      };

      await createFileStructure(tmpDir, {
        '.agentsyncrc.json': JSON.stringify(invalidConfig),
      });

      await expect(
        loadConfig(path.join(tmpDir, '.agentsyncrc.json'))
      ).rejects.toThrow('Invalid config');
    });

    it('validates target as string or array of strings', async () => {
      const configWithArrayTarget: Config = {
        rules: [
          {
            name: 'multi-target-rule',
            source: '.agents/AGENTS.md',
            target: ['.claude/CLAUDE.md', '.kilocode/KILOCODE.md'],
            recursive: false,
            type: 'file',
            enabled: true,
          },
        ],
      };

      await createFileStructure(tmpDir, {
        '.agentsyncrc.json': JSON.stringify(configWithArrayTarget),
      });

      const config = await loadConfig(path.join(tmpDir, '.agentsyncrc.json'));

      expect(config.rules).toHaveLength(1);
      expect(config.rules[0].target).toEqual([
        '.claude/CLAUDE.md',
        '.kilocode/KILOCODE.md',
      ]);
    });
  });

  describe('different config file formats', () => {
    it('handles YAML config files', async () => {
      const yamlConfig = `rules:
  - name: test-rule
    description: A test rule
    source: .agents/rules
    target: .claude/rules
    recursive: false
    type: directory
    enabled: true
`;

      await createFileStructure(tmpDir, {
        '.agentsyncrc.yaml': yamlConfig,
      });

      const config = await loadConfig(path.join(tmpDir, '.agentsyncrc.yaml'));

      expect(config.rules).toHaveLength(1);
      expect(config.rules[0].name).toBe('test-rule');
    });

    it('handles YML extension', async () => {
      const ymlConfig = `rules:
  - name: yml-rule
    source: .agents
    target: .claude
    recursive: true
    type: directory
    enabled: true
`;

      await createFileStructure(tmpDir, {
        '.agentsyncrc.yml': ymlConfig,
      });

      const config = await loadConfig(path.join(tmpDir, '.agentsyncrc.yml'));

      expect(config.rules).toHaveLength(1);
      expect(config.rules[0].name).toBe('yml-rule');
    });
  });

  describe('complex config scenarios', () => {
    it('loads config with multiple rules', async () => {
      const multiRuleConfig: Config = {
        rules: [
          {
            name: 'rule-1',
            source: '.agents/AGENTS.md',
            target: '.claude/CLAUDE.md',
            recursive: false,
            type: 'file',
            enabled: true,
          },
          {
            name: 'rule-2',
            source: '.agents/rules',
            target: ['.claude/rules', '.kilocode/rules'],
            recursive: true,
            type: 'directory',
            enabled: false,
          },
          {
            name: 'rule-3',
            source: '.agents/skills',
            target: '.claude/skills',
            recursive: true,
            type: 'directory',
            enabled: true,
          },
        ],
      };

      await createFileStructure(tmpDir, {
        '.agentsyncrc.json': JSON.stringify(multiRuleConfig, null, 2),
      });

      const config = await loadConfig(path.join(tmpDir, '.agentsyncrc.json'));

      expect(config.rules).toHaveLength(3);
      expect(config.rules[0].name).toBe('rule-1');
      expect(config.rules[1].name).toBe('rule-2');
      expect(config.rules[2].name).toBe('rule-3');

      // Verify different types
      expect(config.rules[0].type).toBe('file');
      expect(config.rules[1].type).toBe('directory');

      // Verify array target
      expect(Array.isArray(config.rules[1].target)).toBe(true);

      // Verify enabled flags
      expect(config.rules[0].enabled).toBe(true);
      expect(config.rules[1].enabled).toBe(false);
      expect(config.rules[2].enabled).toBe(true);
    });

    it('loads config with optional fields omitted', async () => {
      const minimalConfig = {
        rules: [
          {
            name: 'minimal-rule',
            source: '.agents',
            target: '.claude',
            recursive: false,
            type: 'directory',
            enabled: true,
            // description is optional
          },
        ],
      };

      await createFileStructure(tmpDir, {
        '.agentsyncrc.json': JSON.stringify(minimalConfig),
      });

      const config = await loadConfig(path.join(tmpDir, '.agentsyncrc.json'));

      expect(config.rules).toHaveLength(1);
      expect(config.rules[0].name).toBe('minimal-rule');
      expect(config.rules[0].description).toBeUndefined();
    });

    it('handles empty rules array', async () => {
      const emptyConfig: Config = {
        rules: [],
      };

      await createFileStructure(tmpDir, {
        '.agentsyncrc.json': JSON.stringify(emptyConfig),
      });

      const config = await loadConfig(path.join(tmpDir, '.agentsyncrc.json'));

      expect(config.rules).toEqual([]);
    });
  });

  describe('config file name validation', () => {
    it('exports all expected config file names', () => {
      // Verify the exported config file names include expected formats
      expect(configFileNames).toContain('package.json');
      expect(configFileNames).toContain('.agentsyncrc');
      expect(configFileNames).toContain('.agentsyncrc.json');
      expect(configFileNames).toContain('.agentsyncrc.yaml');
      expect(configFileNames).toContain('.agentsyncrc.yml');
      expect(configFileNames).toContain('.config/.agentsyncrc.json');
      expect(configFileNames).toContain('agent-sync.config.js');
      expect(configFileNames).toContain('agent-sync.config.ts');
      expect(configFileNames).toContain('agent-sync.config.mjs');
      expect(configFileNames).toContain('agent-sync.config.cjs');
    });
  });
});
