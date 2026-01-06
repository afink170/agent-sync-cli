import { z } from 'zod';
import { Config } from './config';

export type CLIContext = z.infer<typeof CLIContext>;
export const CLIContext = z.object({
  config: Config,
});

export type BaseCommandInput = z.infer<typeof BaseCommandInput>;
export const BaseCommandInput = z.object({
  cwd: z
    .string()
    .default(() => process.cwd())
    .describe('Working directory'),
  config: z
    .string()
    .optional()
    .describe('Path to config file (absolute path, or relative to `cwd`)'),
  dryRun: z.boolean().default(false).describe('Dry run mode'),
  verbose: z.boolean().default(false).describe('Verbose output'),
});
