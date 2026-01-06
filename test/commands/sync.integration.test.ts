import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { router } from '@/router';
import { Config } from '@/types/config';
import {
  cleanupTmpDir,
  createFileStructure,
  createTmpDir,
} from '../test-utils/filesystem';

describe('sync command integration tests', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await createTmpDir();
  });

  afterEach(async () => {
    await cleanupTmpDir(tmpDir);
  });

  describe('non-recursive sync', () => {
    it('syncs single directory rule', async () => {
      // Create config and source
      const config: Config = {
        rules: [
          {
            name: 'sync-rules',
            source: '.agents/rules',
            target: '.claude/rules',
            recursive: false,
            type: 'directory',
            enabled: true,
          },
        ],
      };

      await createFileStructure(tmpDir, {
        '.agentsyncrc.json': JSON.stringify(config),
        '.agents/rules/rule1.md': 'rule 1 content',
        '.agents/rules/rule2.md': 'rule 2 content',
      });

      // Run sync command
      const caller = router.createCaller({});
      await caller.sync({
        config: path.join(tmpDir, '.agentsyncrc.json'),
        cwd: tmpDir,
      });

      // Verify symlink was created
      const targetPath = path.join(tmpDir, '.claude', 'rules');
      const stats = fsSync.lstatSync(targetPath);
      expect(stats.isSymbolicLink()).toBe(true);

      // Verify can read through symlink
      const content = await fs.readFile(
        path.join(targetPath, 'rule1.md'),
        'utf-8'
      );
      expect(content).toBe('rule 1 content');
    });

    it('syncs single file rule', async () => {
      const config: Config = {
        rules: [
          {
            name: 'sync-agents-file',
            source: '.agents/AGENTS.md',
            target: '.claude/CLAUDE.md',
            recursive: false,
            type: 'file',
            enabled: true,
          },
        ],
      };

      await createFileStructure(tmpDir, {
        '.agentsyncrc.json': JSON.stringify(config),
        '.agents/AGENTS.md': 'agent instructions',
      });

      const caller = router.createCaller({});
      await caller.sync({
        config: path.join(tmpDir, '.agentsyncrc.json'),
        cwd: tmpDir,
      });

      // Verify symlink was created
      const targetPath = path.join(tmpDir, '.claude', 'CLAUDE.md');
      const stats = fsSync.lstatSync(targetPath);
      expect(stats.isSymbolicLink()).toBe(true);

      // Verify can read through symlink
      const content = await fs.readFile(targetPath, 'utf-8');
      expect(content).toBe('agent instructions');
    });

    it('syncs to multiple targets', async () => {
      const config: Config = {
        rules: [
          {
            name: 'sync-to-multiple',
            source: '.agents/AGENTS.md',
            target: ['.claude/CLAUDE.md', '.kilocode/KILOCODE.md'],
            recursive: false,
            type: 'file',
            enabled: true,
          },
        ],
      };

      await createFileStructure(tmpDir, {
        '.agentsyncrc.json': JSON.stringify(config),
        '.agents/AGENTS.md': 'agent instructions',
      });

      const caller = router.createCaller({});
      await caller.sync({
        config: path.join(tmpDir, '.agentsyncrc.json'),
        cwd: tmpDir,
      });

      // Verify both symlinks were created
      const claudePath = path.join(tmpDir, '.claude', 'CLAUDE.md');
      const kilocodePath = path.join(tmpDir, '.kilocode', 'KILOCODE.md');

      expect(fsSync.lstatSync(claudePath).isSymbolicLink()).toBe(true);
      expect(fsSync.lstatSync(kilocodePath).isSymbolicLink()).toBe(true);

      // Verify both can read the same content
      const claudeContent = await fs.readFile(claudePath, 'utf-8');
      const kilocodeContent = await fs.readFile(kilocodePath, 'utf-8');

      expect(claudeContent).toBe('agent instructions');
      expect(kilocodeContent).toBe('agent instructions');
    });

    it('processes multiple rules', async () => {
      const config: Config = {
        rules: [
          {
            name: 'sync-agents-file',
            source: '.agents/AGENTS.md',
            target: '.claude/CLAUDE.md',
            recursive: false,
            type: 'file',
            enabled: true,
          },
          {
            name: 'sync-rules-dir',
            source: '.agents/rules',
            target: '.claude/rules',
            recursive: false,
            type: 'directory',
            enabled: true,
          },
          {
            name: 'sync-skills-dir',
            source: '.agents/skills',
            target: '.claude/skills',
            recursive: false,
            type: 'directory',
            enabled: true,
          },
        ],
      };

      await createFileStructure(tmpDir, {
        '.agentsyncrc.json': JSON.stringify(config),
        '.agents/AGENTS.md': 'agents file',
        '.agents/rules/rule1.md': 'rule 1',
        '.agents/skills/skill1.md': 'skill 1',
      });

      const caller = router.createCaller({});
      await caller.sync({
        config: path.join(tmpDir, '.agentsyncrc.json'),
        cwd: tmpDir,
      });

      // Verify all three symlinks were created
      const agentsPath = path.join(tmpDir, '.claude', 'CLAUDE.md');
      const rulesPath = path.join(tmpDir, '.claude', 'rules');
      const skillsPath = path.join(tmpDir, '.claude', 'skills');

      expect(fsSync.lstatSync(agentsPath).isSymbolicLink()).toBe(true);
      expect(fsSync.lstatSync(rulesPath).isSymbolicLink()).toBe(true);
      expect(fsSync.lstatSync(skillsPath).isSymbolicLink()).toBe(true);
    });
  });

  describe('recursive sync', () => {
    it('syncs file across multiple directories', async () => {
      const config: Config = {
        rules: [
          {
            name: 'recursive-agents-sync',
            source: 'AGENTS.md',
            target: 'CLAUDE.md',
            recursive: true,
            type: 'file',
            enabled: true,
          },
        ],
      };

      await createFileStructure(tmpDir, {
        '.agentsyncrc.json': JSON.stringify(config),
        'project1/AGENTS.md': 'project 1 agents',
        'project2/AGENTS.md': 'project 2 agents',
        'project3/nested/AGENTS.md': 'project 3 nested agents',
      });

      const caller = router.createCaller({});
      await caller.sync({
        config: path.join(tmpDir, '.agentsyncrc.json'),
        cwd: tmpDir,
      });

      // Verify symlinks were created in all directories with AGENTS.md
      const project1Link = path.join(tmpDir, 'project1', 'CLAUDE.md');
      const project2Link = path.join(tmpDir, 'project2', 'CLAUDE.md');
      const project3Link = path.join(tmpDir, 'project3', 'nested', 'CLAUDE.md');

      expect(fsSync.lstatSync(project1Link).isSymbolicLink()).toBe(true);
      expect(fsSync.lstatSync(project2Link).isSymbolicLink()).toBe(true);
      expect(fsSync.lstatSync(project3Link).isSymbolicLink()).toBe(true);

      // Verify each symlink points to the correct source
      const project1Content = await fs.readFile(project1Link, 'utf-8');
      const project2Content = await fs.readFile(project2Link, 'utf-8');
      const project3Content = await fs.readFile(project3Link, 'utf-8');

      expect(project1Content).toBe('project 1 agents');
      expect(project2Content).toBe('project 2 agents');
      expect(project3Content).toBe('project 3 nested agents');
    });

    it('syncs to multiple targets recursively', async () => {
      const config: Config = {
        rules: [
          {
            name: 'recursive-multi-target',
            source: 'AGENTS.md',
            target: ['CLAUDE.md', 'KILOCODE.md'],
            recursive: true,
            type: 'file',
            enabled: true,
          },
        ],
      };

      await createFileStructure(tmpDir, {
        '.agentsyncrc.json': JSON.stringify(config),
        'project1/AGENTS.md': 'project 1 agents',
        'project2/AGENTS.md': 'project 2 agents',
      });

      const caller = router.createCaller({});
      await caller.sync({
        config: path.join(tmpDir, '.agentsyncrc.json'),
        cwd: tmpDir,
      });

      // Verify symlinks were created for both targets in both directories
      const p1Claude = path.join(tmpDir, 'project1', 'CLAUDE.md');
      const p1Kilocode = path.join(tmpDir, 'project1', 'KILOCODE.md');
      const p2Claude = path.join(tmpDir, 'project2', 'CLAUDE.md');
      const p2Kilocode = path.join(tmpDir, 'project2', 'KILOCODE.md');

      expect(fsSync.lstatSync(p1Claude).isSymbolicLink()).toBe(true);
      expect(fsSync.lstatSync(p1Kilocode).isSymbolicLink()).toBe(true);
      expect(fsSync.lstatSync(p2Claude).isSymbolicLink()).toBe(true);
      expect(fsSync.lstatSync(p2Kilocode).isSymbolicLink()).toBe(true);
    });

    it('handles monorepo structure with recursive sync', async () => {
      const config: Config = {
        rules: [
          {
            name: 'monorepo-agents-sync',
            source: 'AGENTS.md',
            target: 'CLAUDE.md',
            recursive: true,
            type: 'file',
            enabled: true,
          },
        ],
      };

      await createFileStructure(tmpDir, {
        '.agentsyncrc.json': JSON.stringify(config),
        'apps/app1/AGENTS.md': 'app1 agents',
        'apps/app2/AGENTS.md': 'app2 agents',
        'packages/pkg1/AGENTS.md': 'pkg1 agents',
        'packages/pkg2/AGENTS.md': 'pkg2 agents',
        'packages/pkg3/nested/AGENTS.md': 'pkg3 nested agents',
      });

      const caller = router.createCaller({});
      await caller.sync({
        config: path.join(tmpDir, '.agentsyncrc.json'),
        cwd: tmpDir,
      });

      // Verify symlinks in all locations
      const paths = [
        'apps/app1/CLAUDE.md',
        'apps/app2/CLAUDE.md',
        'packages/pkg1/CLAUDE.md',
        'packages/pkg2/CLAUDE.md',
        'packages/pkg3/nested/CLAUDE.md',
      ];

      for (const relPath of paths) {
        const fullPath = path.join(tmpDir, relPath);
        expect(fsSync.lstatSync(fullPath).isSymbolicLink()).toBe(true);
      }
    });
  });

  describe('rule filtering', () => {
    it('processes only enabled rules', async () => {
      const config: Config = {
        rules: [
          {
            name: 'enabled-rule',
            source: '.agents/AGENTS.md',
            target: '.claude/CLAUDE.md',
            recursive: false,
            type: 'file',
            enabled: true,
          },
          {
            name: 'disabled-rule',
            source: '.agents/rules',
            target: '.kilocode/rules',
            recursive: false,
            type: 'directory',
            enabled: false,
          },
        ],
      };

      await createFileStructure(tmpDir, {
        '.agentsyncrc.json': JSON.stringify(config),
        '.agents/AGENTS.md': 'agents file',
        '.agents/rules/rule1.md': 'rule 1',
      });

      const caller = router.createCaller({});
      await caller.sync({
        config: path.join(tmpDir, '.agentsyncrc.json'),
        cwd: tmpDir,
      });

      // Verify enabled rule was processed
      const claudePath = path.join(tmpDir, '.claude', 'CLAUDE.md');
      expect(fsSync.lstatSync(claudePath).isSymbolicLink()).toBe(true);

      // Verify disabled rule was NOT processed
      const kilocodePath = path.join(tmpDir, '.kilocode', 'rules');
      expect(() => fsSync.lstatSync(kilocodePath)).toThrow();
    });

    it('processes specific rule when --rule flag is used', async () => {
      const config: Config = {
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
            target: '.claude/rules',
            recursive: false,
            type: 'directory',
            enabled: true,
          },
        ],
      };

      await createFileStructure(tmpDir, {
        '.agentsyncrc.json': JSON.stringify(config),
        '.agents/AGENTS.md': 'agents file',
        '.agents/rules/rule1.md': 'rule 1',
      });

      // Sync only rule-1
      const caller = router.createCaller({});
      await caller.sync({
        config: path.join(tmpDir, '.agentsyncrc.json'),
        rule: 'rule-1',
        cwd: tmpDir,
      });

      // Verify only rule-1 was processed
      const claudePath = path.join(tmpDir, '.claude', 'CLAUDE.md');
      expect(fsSync.lstatSync(claudePath).isSymbolicLink()).toBe(true);

      // Verify rule-2 was NOT processed
      const rulesPath = path.join(tmpDir, '.claude', 'rules');
      expect(() => fsSync.lstatSync(rulesPath)).toThrow();
    });

    it('processes disabled rule when specified with --rule flag', async () => {
      const config: Config = {
        rules: [
          {
            name: 'disabled-rule',
            source: '.agents/AGENTS.md',
            target: '.claude/CLAUDE.md',
            recursive: false,
            type: 'file',
            enabled: false,
          },
        ],
      };

      await createFileStructure(tmpDir, {
        '.agentsyncrc.json': JSON.stringify(config),
        '.agents/AGENTS.md': 'agents file',
      });

      // Sync the disabled rule explicitly
      const caller = router.createCaller({});
      await caller.sync({
        config: path.join(tmpDir, '.agentsyncrc.json'),
        rule: 'disabled-rule',
        cwd: tmpDir,
      });

      // Verify rule was processed despite being disabled
      const claudePath = path.join(tmpDir, '.claude', 'CLAUDE.md');
      expect(fsSync.lstatSync(claudePath).isSymbolicLink()).toBe(true);
    });
  });

  describe('error handling', () => {
    it('skips rules with missing sources', async () => {
      const config: Config = {
        rules: [
          {
            name: 'missing-source',
            source: '.agents/nonexistent',
            target: '.claude/rules',
            recursive: false,
            type: 'directory',
            enabled: true,
          },
          {
            name: 'valid-rule',
            source: '.agents/AGENTS.md',
            target: '.claude/CLAUDE.md',
            recursive: false,
            type: 'file',
            enabled: true,
          },
        ],
      };

      await createFileStructure(tmpDir, {
        '.agentsyncrc.json': JSON.stringify(config),
        '.agents/AGENTS.md': 'agents file',
      });

      // Should not throw, just skip the missing source
      const caller = router.createCaller({});
      await caller.sync({
        config: path.join(tmpDir, '.agentsyncrc.json'),
        cwd: tmpDir,
      });

      // Verify missing source was NOT created
      const rulesPath = path.join(tmpDir, '.claude', 'rules');
      expect(() => fsSync.lstatSync(rulesPath)).toThrow();

      // Verify valid rule was processed
      const claudePath = path.join(tmpDir, '.claude', 'CLAUDE.md');
      expect(fsSync.lstatSync(claudePath).isSymbolicLink()).toBe(true);
    });

    it('handles empty config gracefully', async () => {
      const config: Config = {
        rules: [],
      };

      await createFileStructure(tmpDir, {
        '.agentsyncrc.json': JSON.stringify(config),
      });

      const caller = router.createCaller({});

      // Should not throw
      await expect(
        caller.sync({
          config: path.join(tmpDir, '.agentsyncrc.json'),
          cwd: tmpDir,
        })
      ).resolves.not.toThrow();
    });

    it('updates incorrect existing symlinks', async () => {
      const config: Config = {
        rules: [
          {
            name: 'update-rule',
            source: '.agents/AGENTS.md',
            target: '.claude/CLAUDE.md',
            recursive: false,
            type: 'file',
            enabled: true,
          },
        ],
      };

      await createFileStructure(tmpDir, {
        '.agentsyncrc.json': JSON.stringify(config),
        '.agents/AGENTS.md': 'correct content',
      });

      // Create incorrect symlink
      await fs.mkdir(path.join(tmpDir, '.claude'), { recursive: true });
      await fs.symlink(
        '.wrong/target.md',
        path.join(tmpDir, '.claude', 'CLAUDE.md'),
        'file'
      );

      // Run sync - should update the symlink
      const caller = router.createCaller({});
      await caller.sync({
        config: path.join(tmpDir, '.agentsyncrc.json'),
        cwd: tmpDir,
      });

      // Verify symlink was updated
      const claudePath = path.join(tmpDir, '.claude', 'CLAUDE.md');
      const linkTarget = fsSync.readlinkSync(claudePath);
      expect(linkTarget).toBe('../.agents/AGENTS.md');

      // Verify can read correct content
      const content = await fs.readFile(claudePath, 'utf-8');
      expect(content).toBe('correct content');
    });
  });

  describe('dry-run mode', () => {
    it('does not create symlinks in dry-run mode', async () => {
      const config: Config = {
        rules: [
          {
            name: 'dry-run-test',
            source: '.agents/AGENTS.md',
            target: '.claude/CLAUDE.md',
            recursive: false,
            type: 'file',
            enabled: true,
          },
        ],
      };

      await createFileStructure(tmpDir, {
        '.agentsyncrc.json': JSON.stringify(config),
        '.agents/AGENTS.md': 'agents file',
      });

      // Run in dry-run mode
      const caller = router.createCaller({});
      await caller.sync({
        config: path.join(tmpDir, '.agentsyncrc.json'),
        dryRun: true,
        cwd: tmpDir,
      });

      // Verify symlink was NOT created
      const claudePath = path.join(tmpDir, '.claude', 'CLAUDE.md');
      expect(() => fsSync.lstatSync(claudePath)).toThrow();
    });

    it('does not update existing symlinks in dry-run mode', async () => {
      const config: Config = {
        rules: [
          {
            name: 'dry-run-update',
            source: '.agents/AGENTS.md',
            target: '.claude/CLAUDE.md',
            recursive: false,
            type: 'file',
            enabled: true,
          },
        ],
      };

      await createFileStructure(tmpDir, {
        '.agentsyncrc.json': JSON.stringify(config),
        '.agents/AGENTS.md': 'agents file',
      });

      // Create incorrect symlink
      await fs.mkdir(path.join(tmpDir, '.claude'), { recursive: true });
      await fs.symlink(
        '.wrong/target.md',
        path.join(tmpDir, '.claude', 'CLAUDE.md'),
        'file'
      );

      const incorrectTarget = fsSync.readlinkSync(
        path.join(tmpDir, '.claude', 'CLAUDE.md')
      );

      // Run in dry-run mode
      const caller = router.createCaller({});
      await caller.sync({
        config: path.join(tmpDir, '.agentsyncrc.json'),
        dryRun: true,
        cwd: tmpDir,
      });

      // Verify symlink was NOT updated
      const claudePath = path.join(tmpDir, '.claude', 'CLAUDE.md');
      const stillIncorrect = fsSync.readlinkSync(claudePath);
      expect(stillIncorrect).toBe(incorrectTarget);
    });
  });

  describe('complex real-world scenarios', () => {
    it('handles complete monorepo sync workflow', async () => {
      const config: Config = {
        rules: [
          // Recursive sync for AGENTS.md in all packages
          {
            name: 'sync-agents-files',
            source: 'AGENTS.md',
            target: ['CLAUDE.md', 'KILOCODE.md'],
            recursive: true,
            type: 'file',
            enabled: true,
          },
          // Non-recursive sync for root rules directory
          {
            name: 'sync-root-rules',
            source: '.agents/rules',
            target: '.claude/rules',
            recursive: false,
            type: 'directory',
            enabled: true,
          },
        ],
      };

      await createFileStructure(tmpDir, {
        '.agentsyncrc.json': JSON.stringify(config),
        // Root level
        '.agents/rules/global-rule.md': 'global rule',
        // Apps
        'apps/web/AGENTS.md': 'web app agents',
        'apps/api/AGENTS.md': 'api app agents',
        // Packages
        'packages/ui/AGENTS.md': 'ui package agents',
        'packages/utils/AGENTS.md': 'utils package agents',
        'packages/shared/nested/AGENTS.md': 'nested agents',
      });

      const caller = router.createCaller({});
      await caller.sync({
        config: path.join(tmpDir, '.agentsyncrc.json'),
        cwd: tmpDir,
      });

      // Verify root rules directory symlink
      const rootRulesPath = path.join(tmpDir, '.claude', 'rules');
      expect(fsSync.lstatSync(rootRulesPath).isSymbolicLink()).toBe(true);

      // Verify recursive AGENTS.md symlinks (both targets)
      const recursiveLocations = [
        'apps/web',
        'apps/api',
        'packages/ui',
        'packages/utils',
        'packages/shared/nested',
      ];

      for (const location of recursiveLocations) {
        const claudePath = path.join(tmpDir, location, 'CLAUDE.md');
        const kilocodePath = path.join(tmpDir, location, 'KILOCODE.md');

        expect(fsSync.lstatSync(claudePath).isSymbolicLink()).toBe(true);
        expect(fsSync.lstatSync(kilocodePath).isSymbolicLink()).toBe(true);
      }
    });

    it('handles mixed file and directory rules', async () => {
      const config: Config = {
        rules: [
          {
            name: 'sync-agents-file',
            source: '.agents/AGENTS.md',
            target: '.claude/CLAUDE.md',
            recursive: false,
            type: 'file',
            enabled: true,
          },
          {
            name: 'sync-rules-dir',
            source: '.agents/rules',
            target: '.claude/rules',
            recursive: false,
            type: 'directory',
            enabled: true,
          },
          {
            name: 'sync-skills-dir',
            source: '.agents/skills',
            target: '.claude/skills',
            recursive: false,
            type: 'directory',
            enabled: true,
          },
          {
            name: 'recursive-readme',
            source: 'README.md',
            target: 'INSTRUCTIONS.md',
            recursive: true,
            type: 'file',
            enabled: true,
          },
        ],
      };

      await createFileStructure(tmpDir, {
        '.agentsyncrc.json': JSON.stringify(config),
        '.agents/AGENTS.md': 'root agents',
        '.agents/rules/rule1.md': 'rule 1',
        '.agents/skills/skill1.md': 'skill 1',
        'project1/README.md': 'project 1 readme',
        'project2/README.md': 'project 2 readme',
      });

      const caller = router.createCaller({});
      await caller.sync({
        config: path.join(tmpDir, '.agentsyncrc.json'),
        cwd: tmpDir,
      });

      // Verify non-recursive symlinks
      expect(
        fsSync
          .lstatSync(path.join(tmpDir, '.claude', 'CLAUDE.md'))
          .isSymbolicLink()
      ).toBe(true);
      expect(
        fsSync.lstatSync(path.join(tmpDir, '.claude', 'rules')).isSymbolicLink()
      ).toBe(true);
      expect(
        fsSync
          .lstatSync(path.join(tmpDir, '.claude', 'skills'))
          .isSymbolicLink()
      ).toBe(true);

      // Verify recursive symlinks
      expect(
        fsSync
          .lstatSync(path.join(tmpDir, 'project1', 'INSTRUCTIONS.md'))
          .isSymbolicLink()
      ).toBe(true);
      expect(
        fsSync
          .lstatSync(path.join(tmpDir, 'project2', 'INSTRUCTIONS.md'))
          .isSymbolicLink()
      ).toBe(true);
    });
  });
});
