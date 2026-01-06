/**
 * Test utilities for agent-sync-cli
 *
 * This module provides helpers for filesystem testing, including:
 * - Temporary directory management for integration tests
 * - In-memory filesystem mocking with memfs for unit tests
 * - Common mock setups for external dependencies like cosmiconfig
 */

export {
  cleanupTmpDir,
  createFileStructure,
  createTmpDir,
} from './filesystem.js';
export { createMockCosmiconfig, setupMemfs, vi } from './mocks.js';
