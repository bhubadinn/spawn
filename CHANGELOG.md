# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-03-20

### Added
- Interactive CLI wizard for `spawn init` — step-by-step team setup (name, model, permissions, budget, agents with `$EDITOR` for instructions)
- Interactive fallback for `spawn up` when no flags or team.yaml — choose YAML, quick mode, or run init wizard
- `spawn init -y` / `--yes` flag to skip wizard and use static template (backward compat)
- `@inquirer/prompts` dependency for interactive prompts

## [0.1.0] - 2026-03-20

### Added
- CLI tool (`spawn`) for spawning collaborative Claude Code agent teams in tmux
- `spawn up` — create and start a team from YAML or quick mode (`--agents N`)
- `spawn down` — graceful and force teardown of running teams
- `spawn status` — display team state, agent status, and task summary
- `spawn attach` — connect to a team's tmux session
- `spawn logs` — view agent pane output, filterable by agent
- `spawn list` — list all active teams
- `spawn init` — generate a starter `team.yaml`
- Shared workspace filesystem for inter-agent communication (tasks, messages, status, decisions)
- System prompt builder with team awareness, workspace protocol, and shared context injection
- Team state persistence to `~/.spawn/teams/`
- Support for team YAML configuration with per-agent roles, instructions, model, and budget
- Quick mode: `spawn up -n 4` generates a lead + N-1 workers automatically

[Unreleased]: https://github.com/bhubadinn/spawn/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/bhubadinn/spawn/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/bhubadinn/spawn/releases/tag/v0.1.0
