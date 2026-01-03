import fs from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { syncSymlink } from './symlink-manager';

describe('symlink-manager', () => {
  let testDir: string;
  let sourceDir: string;
  let targetDir: string;

  beforeEach(() => {
    // Create unique test directory for each test
    testDir = path.join(
      process.cwd(),
      'test-temp',
      `test-${Date.now()}-${Math.random()}`
    );
    sourceDir = path.join(testDir, '.agents', 'rules');
    targetDir = path.join(testDir, '.kilocode', 'rules');

    // Create test directory and source
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.writeFileSync(path.join(sourceDir, 'test.txt'), 'test content');
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('creates symlink when parent directory does not exist', () => {
    // Verify parent directory doesn't exist
    expect(fs.existsSync(path.join(testDir, '.kilocode'))).toBe(false);

    // Create symlink - this should work even though parent doesn't exist
    syncSymlink(testDir, '.agents/rules', '.kilocode/rules', 'directory');

    // Verify symlink was created (use lstatSync which doesn't follow symlinks)
    const stat = fs.lstatSync(targetDir);
    expect(stat.isSymbolicLink()).toBe(true);

    // Verify symlink points to correct target
    const linkTarget = fs.readlinkSync(targetDir);
    expect(linkTarget).toBe('.agents/rules');
  });

  it('creates symlink when parent directory exists', () => {
    // Create parent directory first
    fs.mkdirSync(path.join(testDir, '.claude'), { recursive: true });

    // Create symlink
    syncSymlink(testDir, '.agents/rules', '.claude/rules', 'directory');

    // Verify symlink was created (use lstatSync which doesn't follow symlinks)
    const claudeTarget = path.join(testDir, '.claude', 'rules');
    const stat = fs.lstatSync(claudeTarget);
    expect(stat.isSymbolicLink()).toBe(true);

    // Verify symlink points to correct target
    const linkTarget = fs.readlinkSync(claudeTarget);
    expect(linkTarget).toBe('.agents/rules');
  });

  it('skips when source does not exist', () => {
    // Try to create symlink from non-existent source
    syncSymlink(testDir, '.agents/nonexistent', '.kilocode/rules', 'directory');

    // Verify symlink was NOT created
    expect(() => fs.lstatSync(targetDir)).toThrow();
  });

  it('updates incorrect symlink', () => {
    // Create parent directory and incorrect symlink
    fs.mkdirSync(path.join(testDir, '.kilocode'), { recursive: true });
    fs.symlinkSync('.wrong/target', targetDir, 'dir');

    // Verify incorrect symlink exists
    expect(fs.readlinkSync(targetDir)).toBe('.wrong/target');

    // Update symlink
    syncSymlink(testDir, '.agents/rules', '.kilocode/rules', 'directory');

    // Verify symlink was updated
    expect(fs.readlinkSync(targetDir)).toBe('.agents/rules');
  });

  it('skips when symlink is already correct', () => {
    // Create parent directory and correct symlink
    fs.mkdirSync(path.join(testDir, '.kilocode'), { recursive: true });
    fs.symlinkSync('.agents/rules', targetDir, 'dir');

    const beforeStat = fs.lstatSync(targetDir);

    // Call syncSymlink - should skip
    syncSymlink(testDir, '.agents/rules', '.kilocode/rules', 'directory');

    const afterStat = fs.lstatSync(targetDir);

    // Verify symlink unchanged (same inode)
    expect(beforeStat.ino).toBe(afterStat.ino);
  });
});
