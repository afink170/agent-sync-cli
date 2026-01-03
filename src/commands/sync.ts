import { loadConfig } from '@/core/config-loader';
import { findDirectoriesWithFile } from '@/core/file-utils';
import { Logger, logger } from '@/core/logger';
import { syncSymlink } from '@/core/symlink-manager';

/**
 * Executes the synchronization process based on the configuration rules.
 * Processes enabled rules or a specific rule if specified, handling recursive and non-recursive sync operations.
 * @param options - Command options including rule filter, config path, dry-run mode, and verbosity.
 */
export async function syncCommand(options: {
  rule?: string;
  config?: string;
  dryRun?: boolean;
  verbose?: boolean;
}) {
  const config = await loadConfig(options.config);
  Logger.configure(options);
  const rules = options.rule
    ? config.rules.filter((r) => r.name === options.rule)
    : config.rules.filter((r) => r.enabled);

  for (const rule of rules) {
    logger.info(`Processing rule: ${rule.name}`);
    const targets = Array.isArray(rule.target) ? rule.target : [rule.target];
    if (rule.recursive && rule.type === 'file') {
      const dirs = await findDirectoriesWithFile(process.cwd(), rule.source);
      for (const dir of dirs) {
        for (const target of targets) {
          syncSymlink(dir, rule.source, target, rule.type);
        }
      }
    } else {
      for (const target of targets) {
        syncSymlink(process.cwd(), rule.source, target, rule.type);
      }
    }
  }
}
