import { vol } from 'memfs';
import { beforeEach, vi } from 'vitest';

/**
 * Set up memfs for tests by resetting the volume before each test.
 *
 * Call this function in a describe block to automatically reset the
 * in-memory filesystem before each test to ensure test isolation.
 *
 * @example
 * ```typescript
 * describe('my tests', () => {
 *   setupMemfs();
 *
 *   it('should work with mocked fs', () => {
 *     vol.fromJSON({ '/test/file.txt': 'content' });
 *     // ... test code
 *   });
 * });
 * ```
 */
export function setupMemfs() {
  beforeEach(() => {
    vol.reset();
  });
}

/**
 * Create a mock cosmiconfig instance for testing.
 *
 * @param config - The config object to return, or null if no config found
 * @param filepath - The filepath to report, defaults to '/test/.agent-syncrc.json'
 * @returns A mock cosmiconfig explorer object
 * @example
 * ```typescript
 * import { cosmiconfig } from 'cosmiconfig';
 * import { vi } from 'vitest';
 *
 * vi.mock('cosmiconfig', () => ({
 *   cosmiconfig: vi.fn()
 * }));
 *
 * it('should load config', async () => {
 *   const mockExplorer = createMockCosmiconfig({ rules: [] });
 *   vi.mocked(cosmiconfig).mockReturnValue(mockExplorer);
 *   // ... test code
 * });
 * ```
 */
export function createMockCosmiconfig(
  config: Record<string, unknown> | null,
  filepath = '/test/.agent-syncrc.json'
) {
  return {
    search: vi.fn().mockResolvedValue(
      config
        ? {
            config,
            filepath,
          }
        : null
    ),
    load: vi.fn(),
    clearCaches: vi.fn(),
    clearLoadCache: vi.fn(),
    clearSearchCache: vi.fn(),
  };
}

/**
 * Import vitest's vi for use in mock setups.
 * Re-exported for convenience in test files.
 */
export { vi } from 'vitest';
