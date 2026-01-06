import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { syncCommand } from './commands/sync';
import { validateCommand } from './commands/validate';
import { loadConfig } from './core/config-loader';
import { Logger } from './core/logger';
import { BaseCommandInput, CLIContext } from './types/trpc-cli';

const t = initTRPC.context<Partial<CLIContext>>().create();

const configuredProcedure = t.procedure
  .input(BaseCommandInput)
  .use(async (opts) => {
    const {
      config: configFile,
      dryRun,
      verbose,
      cwd = process.cwd(),
    } = opts.input;
    Logger.configure({ dryRun, verbose });
    const config = await loadConfig(configFile, cwd);
    return opts.next({
      ctx: { config },
      input: { cwd, dryRun, verbose },
    });
  });

const router = t.router({
  sync: configuredProcedure
    .meta({
      description: 'Sync all enabled rules',
    })
    .input(
      BaseCommandInput.extend({
        rule: z.string().optional().describe('Sync specific rule'),
      })
    )
    .mutation(syncCommand),

  validate: configuredProcedure
    .meta({
      description: 'Validate config',
    })
    .mutation(validateCommand),
});

export { router };
