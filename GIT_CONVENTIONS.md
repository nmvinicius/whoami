# Git Conventions

This project follows strict git conventions to ensure a clean and maintainable history.

## Branch Protection

- **Direct commits to `main` (or `master`) are disabled.**
- You must create a new branch for every feature or fix.
- Branch naming convention: `type/short-description`
  - Examples:
    - `feat/user-login`
    - `fix/header-alignment`
    - `docs/update-readme`

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/).

Format: `<type>(<scope>): <subject>`

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to the build process or auxiliary tools and libraries such as documentation generation

### Examples

- `feat(auth): add google login support`
- `fix(navbar): fix responsive layout on mobile`
- `docs: update installation guide`
- `style: format code with prettier`
