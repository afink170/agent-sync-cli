# AGENTS.md

This file provides guidance to AI agents when working with code in this repository.

For build tools, development workflow, and commit guidelines, see [@DEVELOPMENT.md](DEVELOPMENT.md).

## Project Overview

Agent Sync CLI is a tool that manages synchronization of AI coding agent files (like `AGENTS.md`, `CLAUDE.md`, and skills directories) between different AI tools using configurable symlink rules.

## Running the CLI Locally

```bash
# During development, test the CLI with:
node dist/index.js sync --dry-run --verbose
node dist/index.js validate
```

## Architecture

### CLI Framework

- Uses **trpc-cli** to create the CLI interface from tRPC router definitions
- Entry point: `src/index.ts` creates the CLI from `src/router.ts`
- Commands are defined as tRPC procedures in `src/router.ts` and implemented in `src/commands/{commandName}`

### Configuration System

- Uses **cosmiconfig** for flexible config file discovery
- Config loader in `src/core/config-loader.ts` searches multiple locations (see `README.md` for full list)
- Config is validated with Zod schemas defined in `src/types/config.ts`
- JSON schema is auto-generated from Zod types via `scripts/generate-schema.ts` and written to [`schemas/agent-sync-config.json`](./schemas/agent-sync-config.json)

### Core Components

**Config Types** (`src/types/config.ts`):

- `Rule` defines sync rules with source/target paths, recursive options, and file/directory types
- `Config` contains an array of rules
- Both use Zod schemas with `.meta()` for JSON schema generation

**Sync Logic** (`src/commands/sync.ts`):

- Filters enabled rules (or specific rule via `--rule` flag)
- For recursive file rules: finds all directories containing source file and syncs in each
- For non-recursive rules: syncs once from current working directory
- Uses `Logger` class for dry-run and verbose output

**Symlink Management** (`src/core/symlink-manager.ts`):

- `syncSymlink()` creates/updates symlinks with proper validation
- Checks if source exists before creating symlinks
- Verifies existing symlinks point to correct target
- Handles file vs directory symlink types

**File Utilities** (`src/core/file-utils.ts`):

- `findDirectoriesWithFile()` recursively searches for directories containing a specific file
- Used for recursive file sync rules to discover all sync locations

### Path Resolution

The path alias `@/*` maps to `./src/*` (configured in `tsconfig.json`). When adding imports, use `@/` prefix for internal modules.

## Build Process

The build uses **tsup** with ESM output format. The `prebuild` hook automatically generates the JSON schema from Zod types before building. See [@DEVELOPMENT.md](DEVELOPMENT.md) for details on the build process and git hooks.

## Testing Notes

When writing tests:

- Use Vitest (configured in package.json)
- Tests run with ES modules (project is `"type": "module"`)

## Agent Reports

When writing ad-hoc report files as part of task execution, reports should be written to the `.agents/reports/` folder, which is not stored in version control.
