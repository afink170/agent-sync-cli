# Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for all commit messages.

## Format

```
<type>(optional-scope): <description>

[optional body]

[optional footer(s)]
```

## Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that don't affect code meaning (formatting, white-space)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `build`: Changes to build system or dependencies
- `ci`: Changes to CI configuration
- `chore`: Other changes that don't modify src or test files

## Examples

```
feat: add validate command to CLI
```

```
fix(sync): handle missing source files gracefully
```

```
docs: update AGENTS.md with path resolution details
```

```
refactor(config): simplify schema validation logic
```

```
chore: update dependencies
```

## Rules

- Use lowercase for type and description
- Keep description under 72 characters
- Use imperative mood ("add" not "added" or "adds")
- Don't end description with a period
- Include scope when change affects specific component
