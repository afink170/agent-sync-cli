import { z } from 'zod';

export type Rule = z.infer<typeof Rule>;
export const Rule = z
  .object({
    name: z.string().meta({
      description: 'A unique name identifying the synchronization rule.',
    }),
    description: z.string().optional().meta({
      description:
        "An optional human-readable description of the rule's purpose.",
    }),
    source: z.string().meta({
      description:
        'The path to the source file or directory to be synchronized.',
    }),
    target: z
      .union([z.string().nonempty(), z.string().nonempty().array().nonempty()])
      .meta({
        description:
          'The path to the target location where the source should be synced.',
      }),
    recursive: z.boolean().meta({
      description:
        'Whether to apply the synchronization recursively to subdirectories.',
    }),
    type: z.enum(['file', 'directory']).meta({
      description:
        'The type of item to synchronize: either a single file or an entire directory.',
    }),
    enabled: z.boolean().meta({
      description:
        'Whether this rule is enabled and should be processed during synchronization.',
    }),
  })
  .meta({
    id: 'sync-rule',
    description: 'Rule defining how a file or directory should be synced.',
  });

export type Config = z.infer<typeof Config>;
export const Config = z.object({
  rules: Rule.array(),
});
