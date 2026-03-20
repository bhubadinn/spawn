# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

`spawn` — a CLI tool that spawns collaborative Claude Code agent teams in tmux. Also contains the reference guide (`claude-code-swarm-setup-guide.md`) it was built from.

## Commands

```bash
npm install          # Install dependencies
spawn --help         # Show CLI help
spawn init           # Generate starter team.yaml in current directory
spawn up             # Start team from ./team.yaml (auto-attaches to tmux)
spawn up -n 4        # Quick mode: 4 agents (1 lead + 3 workers)
spawn up -t team.yaml --detach   # Start from YAML, don't attach
spawn status         # Show team state, agent status, task counts
spawn logs           # View all agent pane output
spawn logs -a lead   # View specific agent output
spawn attach         # Attach to running team's tmux session
spawn down           # Graceful shutdown (15s wait)
spawn down -f        # Force kill immediately
spawn list           # List all active teams
```

Global install: `npm link` from project root.

## Architecture

```
bin/spawn.js          Entry point (Node native TS via --experimental-strip-types)
src/cli.ts            Commander.js command definitions
src/commands/         One file per command (up, down, status, attach, logs, list, init)
src/core/
  tmux.ts             tmux session/pane management
  workspace.ts        Shared filesystem (tasks/, status/, messages/, etc.)
  prompt-builder.ts   Builds per-agent system prompts with team protocol
  team-config.ts      YAML parsing + validation + quick-mode generation
  state.ts            Persists team state to ~/.spawn/teams/
src/types/index.ts    TypeScript interfaces
src/utils/            Logger, paths, process helpers
templates/            Example team.yaml files
```

## How It Works

1. `spawn up` reads a team.yaml (or generates one from `--agents N`)
2. Creates a shared workspace directory with `tasks/`, `status/`, `messages/`, etc.
3. Creates a tmux session with one pane per agent
4. Launches `claude --append-system-prompt "$(cat prompt)" --dangerously-skip-permissions` in each pane
5. Each agent's system prompt contains: identity, team roster, workspace protocol, communication conventions
6. Agents collaborate by reading/writing markdown files in the shared workspace
7. State is persisted to `~/.spawn/teams/{name}.json`

## Critical Rules

- **tmux send-keys**: Text and Enter MUST be sent as separate commands (`sendKeys` then `sendEnter`). Combining them garbles input. The `-l` flag is used for literal text.
- **CLAUDECODE env var**: Must `unset CLAUDECODE` before launching Claude in tmux panes to avoid nested session error.
- **No shell in execFile**: `exec()` in `utils/process.ts` uses `execFile` without `shell: true` — arguments are passed directly to the process. This is intentional to preserve spaces and special characters.
- **Workspace is the communication bus**: Agents don't share context directly. They read/write files in the workspace (tasks, status, messages, decisions).

## Team YAML Format

```yaml
name: my-team
description: "Mission description"
settings:
  model: sonnet                    # optional
  budget_per_agent: 5.00           # optional USD cap
  permissions: dangerously-skip    # dangerously-skip | accept-edits | default
  shared_context: [./ARCH.md]      # optional files injected into all prompts
agents:
  - name: lead
    role: orchestrator
    instructions: |
      Your instructions here. Use {workspace} as placeholder for workspace path.
```
