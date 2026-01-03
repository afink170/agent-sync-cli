# Development Guide

## Local Development

```bash
git clone https://github.com/afink170/agent-sync-cli.git
cd agent-sync-cli
pnpm install
pnpm dev
```

### Testing

```bash
pnpm test
```

## Build and Development Tools

### Husky

**Git hooks management**

Husky automates Git hooks to enforce code quality checks before commits and pushes.

**Setup:**

Husky is automatically initialized when you run `pnpm install` (via the `prepare` script).

**Configured hooks:**

- `pre-commit`: Runs lint-staged to check and format staged files
- `commit-msg`: Runs commitlint to validate commit messages

### Commitlint

**Commit message linting**

Commitlint ensures all commit messages follow the Conventional Commits format.

**Commit Message Format:**

Commit messages must follow this structure:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Common types:**

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that don't affect code meaning (whitespace, formatting)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `build`: Changes to build system or dependencies
- `ci`: Changes to CI configuration
- `chore`: Other changes that don't modify src or test files

**Examples:**

```
feat: add recursive sync support
fix: resolve symlink validation error
docs: update README with config examples
chore: update dependencies
```

**Manual validation:**

```bash
pnpm commitlint
```

### Lint-staged

**Pre-commit code quality checks**

Lint-staged runs linters and formatters only on staged files before each commit.

**Configured checks:**

- TypeScript files (`*.ts`, `*.js`):
  - Type checking with `tsc --noEmit`
  - Linting with ESLint (auto-fix enabled)
  - Formatting with Prettier
- All other files:
  - Formatting with Prettier

Lint-staged runs automatically on commit via the Husky pre-commit hook.

### Changesets

**Version and changelog management**

Changesets helps manage versioning and changelogs for releases.

**Creating a changeset:**

When you make changes that should be included in the next release:

```bash
pnpm changeset
```

This will prompt you to:

1. Select the type of change (patch, minor, major)
2. Provide a description of the change

**Version and publish workflow:**

```bash
# 1. Apply changesets and update version
pnpm changeset version

# 2. Build and publish
pnpm build
pnpm publish
```

**Configuration:** `.changeset/config.json`

- Base branch: `main`
- Access: `public`
- Changelog format: Default changesets format

### ESLint

**Code linting**

ESLint checks for code quality and potential errors.

```bash
pnpm lint              # Check for issues
pnpm lint:fix          # Auto-fix issues
```

### Prettier

**Code formatting**

Prettier ensures consistent code formatting across the project.

```bash
pnpm format            # Format all files
```

**Plugins:**

- `prettier-plugin-organize-imports`: Automatically organizes imports

### TypeScript

**Type checking**

```bash
pnpm typecheck         # Type check without emitting files
```

TypeScript is also checked as part of lint-staged on every commit.

## Development Workflow

1. **Make changes** to the code
2. **Stage files** with `git add`
3. **Commit** with a conventional commit message
   - Husky triggers lint-staged (type check, lint, format)
   - Commitlint validates the message format
4. _(Optional)_ **Create a changeset** if your changes should be in the release notes. Individual commits don't necessarily need changesets, but PRs cannot be merged without one, so you should create a changeset before opening a PR.
5. **Push** to GitHub

## Build Process

```bash
pnpm build
```

The build process:

1. Runs `prebuild` hook to generate JSON schema from Zod types
2. Bundles source code with tsup to `dist/index.js`
