import { cosmiconfig, CosmiconfigResult } from 'cosmiconfig';
import path from 'path';

import { logger } from '@/core/logger';
import { Config } from '@/types/config';

const moduleName = 'agent-sync';
const rcfileName = '.agentsyncrc';
const jsExtensions = ['.js', '.ts', '.mjs', '.cjs'];
const rcExtensions = ['', '.json', '.yaml', '.yml', ...jsExtensions];

export const configFileNames = [
  'package.json',
  ...rcExtensions.map((ext) => `${rcfileName}${ext}`),
  ...rcExtensions.map((ext) => `.config/${rcfileName}${ext}`),
  ...jsExtensions.map((ext) => `${moduleName}.config${ext}`),
];

const explorer = cosmiconfig(moduleName, {
  searchPlaces: configFileNames,
  packageProp: moduleName,
  mergeSearchPlaces: false,
});

/**
 * Loads and validates the agent-sync configuration.
 * Uses cosmiconfig to search for config files in standard locations.
 * @param configPath - Optional path to a specific config file. If not provided, searches from current working directory.
 * @returns A promise that resolves to the validated Config object.
 * @throws Error if the config is invalid or cannot be parsed.
 */
export async function loadConfig(configPath?: string): Promise<Config> {
  let configData: Config | undefined;
  try {
    let result: CosmiconfigResult;
    if (configPath) {
      // Load the specific config file
      result = await explorer.load(path.resolve(configPath));
    } else {
      // Search for config files starting from cwd
      result = await explorer.search(process.cwd());
    }
    if (result) {
      logger.info(`Found config file at ${result.filepath}`);
    }
    configData = result?.config;
  } catch {
    logger.warn('No config file found');
  }

  const validationResult = Config.safeParse(configData ?? { rules: [] });

  if (!validationResult.success) {
    throw new Error(`Invalid config: ${validationResult.error.message}`);
  }

  return validationResult.data;
}
