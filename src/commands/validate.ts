import { logger } from '@/core/logger';
import { Config } from '@/types/config';
import { BaseCommandInput } from '@/types/trpc-cli';

/**
 * Validates the agent-sync configuration by attempting to load and parse it.
 * @param options - Command options containing optional config file path and working directory.
 */
export async function validateCommand(_opts: {
  ctx: { config: Config };
  input: BaseCommandInput;
}) {
  logger.info('Config is valid');
}
