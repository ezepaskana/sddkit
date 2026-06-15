# Branching Policy Example

Example of a complete and versioned branching policy for sddkit projects.

## Metadata

```json
{
  "versions": [
    {
      "date": "2026-01-15",
      "author": "dev-team",
      "convención": "Conventional Commits",
      "flujo": "GitHub Flow",
      "patrón": "task/{numero}-{slug}"
    },
    {
      "date": "2026-06-15",
      "author": "maintainer",
      "convención": "Conventional Commits",
      "flujo": "GitHub Flow with Release Branches",
      "patrón": "task/{numero}-{slug}"
    }
  ],
  "active": 1
}
```

## Convención de Commits

The **Conventional Commits** standard is used for all commit messages to enable automated changelog generation and semantic versioning.

Format:
```
type(scope): subject

body (optional)
footer (optional)
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`

Example:
```
feat(branching): add support for custom branch patterns

Implements flexible pattern matching for branch name validation.
Closes #123
```

## Flujo de Ramas

**GitHub Flow with Release Branches** is the branching strategy:

1. Main branch (`main`) - production-ready, always deployable
2. Feature/task branches - created from `main`, short-lived
3. Release branches - created when preparing a release
4. Hotfix branches - critical fixes applied directly to release branches

Workflow:
- Create a task branch from `main`
- Make commits following Conventional Commits
- Submit a pull request
- Code review and CI checks pass
- Merge to `main` (squash or rebase)
- Deploy to production

## Patrón de Nombres

Branch naming convention: `task/{numero}-{slug}`

Examples:
- `task/42-add-branching-policy`
- `task/99-fix-test-runner`
- `task/5-update-docs`

Rules:
- Lowercase only
- Use hyphens to separate words
- Maximum 50 characters
- Task number is mandatory (links to issue tracker)
- Slug should be descriptive but concise
