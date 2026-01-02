# AGENTS.md

This file provides guidance to AI agents when working with code in this repository.

## Project Overview

Agent Sync CLI is a tool that manages synchronization of AI coding agent files (like `AGENTS.md`, `CLAUDE.md`, and skills directories) between different AI tools using configurable symlink rules.

## Development Commands

### Build and Development

```bash
pnpm build           # Build the project (runs prebuild hook to generate schema)
pnpm dev             # Watch mode for development
pnpm generate-schema # Generate JSON schema from Zod types
```

### Testing and Quality

```bash
pnpm test            # Run tests with Vitest
pnpm typecheck       # Type check without emitting files
pnpm lint            # Lint code with ESLint
pnpm lint:fix        # Lint and auto-fix issues
pnpm format          # Format code with Prettier
```

### Running the CLI Locally

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

The build uses **tsup** with ESM output format. Before building:

1. `prebuild` hook runs `generate-schema` script
2. This regenerates `schemas/agent-sync-config.json` from Zod types
3. Main build bundles `src/index.ts` to `dist/index.js`

## Git Hooks

Pre-commit hook runs **lint-staged** which:

1. Type checks all TS/JS files
2. Runs ESLint with auto-fix
3. Formats code with Prettier (with organize-imports plugin)

## Testing Notes

When writing tests:

- Use Vitest (configured in package.json)
- Tests run with ES modules (project is `"type": "module"`)
