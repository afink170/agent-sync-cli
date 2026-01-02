import { loadConfig } from '@/core/config-loader';

import { logger } from '@/core/logger';

/**
 * Validates the agent-sync configuration by attempting to load and parse it.
 * @param options - Command options containing optional config file path.
 */
export async function validateCommand(options: { config?: string }) {
  await loadConfig(options.config);
  logger.info('Config is valid');
}
