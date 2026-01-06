import { findDirectoriesWithFile } from '@/core/file-utils';
import { logger } from '@/core/logger';
import { syncSymlink } from '@/core/symlink-manager';
import { Config } from '@/types/config';
import { BaseCommandInput } from '@/types/trpc-cli';

/**
 * Executes the synchronization process based on the configuration rules.
 * Processes enabled rules or a specific rule if specified, handling recursive and non-recursive sync operations.
 * @param opts - Command options including rule filter, config path, dry-run mode, verbosity, and working directory.
 */
export async function syncCommand(opts: {
  ctx: { config: Config };
  input: BaseCommandInput & { rule?: string };
}) {
  const {
    ctx: { config },
    input: { rule, cwd },
  } = opts;

  const rules = rule
    ? config.rules.filter((r) => r.name === rule)
    : config.rules.filter((r) => r.enabled);

  for (const rule of rules) {
    logger.info(`Processing rule: ${rule.name}`);
    const targets = Array.isArray(rule.target) ? rule.target : [rule.target];
    if (rule.recursive && rule.type === 'file') {
      const dirs = await findDirectoriesWithFile(cwd, rule.source);
      for (const dir of dirs) {
        for (const target of targets) {
          syncSymlink(dir, rule.source, target, rule.type);
        }
      }
    } else {
      for (const target of targets) {
        syncSymlink(cwd, rule.source, target, rule.type);
      }
    }
  }
}
