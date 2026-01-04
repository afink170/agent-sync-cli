import { loadConfig } from '@/core/config-loader';
import { describe, expect, it } from 'vitest';

describe('config-loader', () => {
  it.skip('should load default config', async () => {
    const config = await loadConfig();
    expect(config.rules).toHaveLength(3);
    expect(config.rules[0].name).toBe('agents-md');
    expect(config.rules[1].name).toBe('agents-rules');
    expect(config.rules[2].name).toBe('agents-skills');
  });
});
