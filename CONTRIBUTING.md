# Contributing to spawn

## Development Setup

```bash
git clone https://github.com/bhubadinn/spawn.git
cd spawn
npm install
```

## Running Locally

```bash
# Link the CLI globally for testing
npm link

# Run directly without linking
node --experimental-strip-types --experimental-transform-types bin/spawn.js --help

# Typecheck
npm run typecheck
```

## Project Structure

```
bin/spawn.js          Entry point (Node native TS)
src/cli.ts            Commander.js command definitions
src/commands/         One file per command
src/core/             tmux, workspace, prompt builder, config, state
src/types/            TypeScript interfaces
src/utils/            Logger, paths, process helpers
templates/            Example team YAML files
```

## Submitting Changes

1. Fork the repo and create a feature branch from `main`.
2. Make your changes. Run `npm run typecheck` to verify.
3. Write clear commit messages.
4. Open a pull request against `main`.

## Code Style

- TypeScript with Node native strip-types (no build step for dev).
- Keep dependencies minimal.
- One file per command in `src/commands/`.

## Reporting Issues

Use [GitHub Issues](https://github.com/bhubadinn/spawn/issues). Include your Node.js version, OS, and tmux version.
