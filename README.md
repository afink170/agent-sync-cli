# Agent Sync CLI

A CLI tool to manage synchronization of agent files (`AGENTS.md`, `CLAUDE.md`, skills) between different AI tools.

## Installation

```bash
npm install -g agent-sync-cli
# or
pnpm add -g agent-sync-cli
```

## Usage

### Basic Sync

```bash
agent-sync sync
```

### Dry Run

```bash
agent-sync sync --dry-run --verbose
```

### Sync Specific Rule

```bash
agent-sync sync --rule agents-to-claude
```

### Validate Config

```bash
agent-sync validate
```

## Configuration

The config options can be defined in any of the following locations:

```bash
package.json
.agentsyncrc
.agentsyncrc.json
.agentsyncrc.yaml
.agentsyncrc.yml
.agentsyncrc.js
.agentsyncrc.ts
.agentsyncrc.mjs
.agentsyncrc.cjs
.config/.agentsyncrc
.config/.agentsyncrc.json
.config/.agentsyncrc.yaml
.config/.agentsyncrc.yml
.config/.agentsyncrc.js
.config/.agentsyncrc.ts
.config/.agentsyncrc.mjs
.config/.agentsyncrc.cjs
agent-sync.config.js
agent-sync.config.ts
agent-sync.config.mjs
agent-sync.config.cjs
```

Alternatively, the config can be loaded from a custom filepath via the `--config` option.

```bash
agent-sync sync --config my-config.json
```

Example config:

```json
{
  "rules": [
    {
      "name": "agents-to-claude",
      "description": "Create CLAUDE.md symlinks pointing to AGENTS.md files in all directories",
      "source": "AGENTS.md",
      "target": "CLAUDE.md",
      "recursive": true,
      "type": "file",
      "enabled": true
    },
    {
      "name": "claude-skills-to-github",
      "description": "Symlink .claude/skills directory to .github/skills",
      "source": ".claude/skills",
      "target": ".github/skills",
      "recursive": false,
      "type": "directory",
      "enabled": true
    }
  ]
}
```

## Development and Contributing

For detailed information about development, build process, git hooks, commit conventions, and the development workflow, see [DEVELOPMENT.md](./DEVELOPMENT.md).
