import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { router } from '@/router';
import { Config } from '@/types/config';
import {
  cleanupTmpDir,
  createFileStructure,
  createTmpDir,
} from './test-utils/filesystem';

describe('router middleware tests', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await createTmpDir();
  });

  afterEach(async () => {
    await cleanupTmpDir(tmpDir);
  });

  it('returns empty config when config file is missing', async () => {
    const caller = router.createCaller({});

    // Should not throw - missing config files return empty config
    await expect(
      caller.sync({
        config: path.join(tmpDir, 'nonexistent.json'),
        cwd: tmpDir,
        dryRun: true,
      })
    ).resolves.toBeUndefined();
  });

  it('returns empty config when JSON is malformed', async () => {
    await createFileStructure(tmpDir, {
      'invalid.json': '{ invalid json }',
    });

    const caller = router.createCaller({});

    // Should not throw - malformed JSON is caught and empty config is returned
    await expect(
      caller.sync({
        config: path.join(tmpDir, 'invalid.json'),
        cwd: tmpDir,
        dryRun: true,
      })
    ).resolves.toBeUndefined();
  });

  it('throws error for invalid config schema', async () => {
    await createFileStructure(tmpDir, {
      'invalid-schema.json': JSON.stringify({
        rules: [
          {
            // Missing required fields
            name: 'incomplete-rule',
          },
        ],
      }),
    });

    const caller = router.createCaller({});

    await expect(
      caller.sync({
        config: path.join(tmpDir, 'invalid-schema.json'),
        cwd: tmpDir,
      })
    ).rejects.toThrow();
  });

  it('successfully loads valid config through middleware', async () => {
    const config: Config = {
      rules: [
        {
          name: 'test-rule',
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
      '.agents/AGENTS.md': 'test content',
    });

    const caller = router.createCaller({});

    // Should not throw
    await caller.sync({
      config: path.join(tmpDir, '.agentsyncrc.json'),
      cwd: tmpDir,
      dryRun: true,
    });
  });
});
