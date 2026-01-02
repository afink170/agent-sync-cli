import { describe, expect, it } from 'vitest';
import { loadConfig } from './config-loader';

describe('config-loader', () => {
  it('should load default config', async () => {
    const config = await loadConfig();
    expect(config.rules).toHaveLength(2);
    expect(config.rules[0].name).toBe('agents-to-claude');
    expect(config.rules[1].name).toBe('claude-skills-to-github');
  });
});
