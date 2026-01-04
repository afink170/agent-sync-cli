import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

/**
 * Create a unique temporary directory for testing.
 *
 * @returns The absolute path to the created temporary directory
 * @example
 * ```typescript
 * const tmpDir = await createTmpDir();
 * // tmpDir will be something like '/tmp/agent-sync-test-abc123'
 * ```
 */
export async function createTmpDir(): Promise<string> {
  const tmpBase = path.join(os.tmpdir(), 'agent-sync-test-');
  return await fs.mkdtemp(tmpBase);
}

/**
 * Clean up a temporary directory by removing it and all its contents.
 *
 * @param tmpDir - The path to the temporary directory to remove
 * @example
 * ```typescript
 * afterEach(async () => {
 *   await cleanupTmpDir(tmpDir);
 * });
 * ```
 */
export async function cleanupTmpDir(tmpDir: string): Promise<void> {
  await fs.rm(tmpDir, { recursive: true, force: true });
}

/**
 * Create a directory structure in a temporary directory from a JSON object.
 *
 * @param tmpDir - The base temporary directory
 * @param structure - Object where keys are file paths and values are file contents
 * @returns The temporary directory path for chaining
 * @example
 * ```typescript
 * await createFileStructure(tmpDir, {
 *   '.agents/rules/test.md': 'content',
 *   '.agents/AGENTS.md': 'instructions'
 * });
 * ```
 */
export async function createFileStructure(
  tmpDir: string,
  structure: Record<string, string>
): Promise<string> {
  for (const [filePath, content] of Object.entries(structure)) {
    const fullPath = path.join(tmpDir, filePath);
    const dirPath = path.dirname(fullPath);

    // Ensure parent directory exists
    await fs.mkdir(dirPath, { recursive: true });

    // Write file
    await fs.writeFile(fullPath, content, 'utf-8');
  }

  return tmpDir;
}
