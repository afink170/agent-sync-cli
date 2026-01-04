import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { syncCommand } from './commands/sync';
import { validateCommand } from './commands/validate';

const t = initTRPC.create();

const router = t.router({
  sync: t.procedure
    .meta({
      description: 'Sync all enabled rules',
    })
    .input(
      z
        .object({
          rule: z.string().describe('Sync specific rule'),
          config: z.string().describe('Path to config file'),
          dryRun: z.boolean().describe('Dry run mode'),
          verbose: z.boolean().describe('Verbose output'),
        })
        .partial()
    )
    .mutation(({ input }) => syncCommand(input)),

  validate: t.procedure
    .meta({
      description: 'Validate config',
    })
    .input(
      z
        .object({
          config: z.string().describe('Path to config file'),
        })
        .partial()
    )
    .mutation(({ input }) => validateCommand(input)),
});

export { router };
