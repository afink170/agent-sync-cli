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
      z.object({
        rule: z.string().optional().describe('Sync specific rule'),
        config: z.string().optional().describe('Path to config file'),
        dryRun: z.boolean().optional().describe('Dry run mode'),
        verbose: z.boolean().optional().describe('Verbose output'),
      })
    )
    .mutation(async ({ input }) => {
      await syncCommand(input);
    }),
  validate: t.procedure
    .meta({
      description: 'Validate config',
    })
    .input(
      z.object({
        config: z.string().optional().describe('Path to config file'),
      })
    )
    .mutation(async ({ input }) => {
      await validateCommand(input);
    }),
});

export { router };
