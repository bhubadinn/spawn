# spawn

Spawn collaborative Claude Code agent teams in tmux.

[![npm version](https://img.shields.io/npm/v/spawn-cli.svg)](https://www.npmjs.com/package/spawn-cli)
[![license](https://img.shields.io/npm/l/spawn-cli.svg)](https://github.com/bhubadinn/spawn/blob/main/LICENSE)
[![node](https://img.shields.io/node/v/spawn-cli.svg)](https://nodejs.org)

Define a team of Claude Code agents in YAML, and `spawn` launches them in tmux panes with a shared workspace for file-based collaboration.

```
┌─────────────────────────┬─────────────────────────┐
│ lead                    │ builder-1               │
│                         │                         │
│ Reading board.md...     │ Claimed task-001.md     │
│ Breaking into tasks...  │ Implementing auth...    │
│ Assigned task-001 →     │ ██████████░░ 60%        │
│   builder-1             │                         │
├─────────────────────────┼─────────────────────────┤
│ builder-2               │ reviewer                │
│                         │                         │
│ Claimed task-002.md     │ Reviewing task-001...   │
│ Setting up database...  │ LGTM ✓                  │
│ ████████░░░░ 40%        │                         │
│                         │                         │
└─────────────────────────┴─────────────────────────┘
```

## Quick Start

```bash
npm install -g spawn-cli

# Generate a starter team.yaml
spawn init

# Launch the team
spawn up
```

Or skip YAML entirely with quick mode:

```bash
# Spawn 4 agents (1 lead + 3 workers)
spawn up -n 4 --task "Build a REST API with auth"
```

## CLI Reference

### `spawn up`

Create and start a team.

```
spawn up                         # Start from ./team.yaml
spawn up -t custom.yaml          # Use a specific YAML file
spawn up -n 4                    # Quick mode: 1 lead + 3 workers
spawn up -n 4 --task "Build X"   # Quick mode with a task
spawn up -d /path/to/project     # Set working directory
spawn up -m opus                 # Override model for all agents
spawn up --budget 5.00           # Set per-agent budget cap (USD)
spawn up --detach                # Don't attach to tmux after creation
```

### `spawn down`

Teardown a running team.

```
spawn down                       # Graceful shutdown (15s wait)
spawn down -f                    # Force kill immediately
spawn down --team-name my-team   # Stop a specific team
```

### `spawn status`

Show team state, agent status, and task counts.

```
spawn status
spawn status --team-name my-team
```

### `spawn logs`

View agent output.

```
spawn logs                       # All agents
spawn logs -a lead               # Specific agent
spawn logs -l 50                 # Last 50 lines
```

### `spawn attach`

Attach to a running team's tmux session.

```
spawn attach
spawn attach --team-name my-team
```

### `spawn list`

List all active teams.

### `spawn init`

Generate a starter `team.yaml` in the current directory.

## Team YAML Format

```yaml
name: my-team
description: "Build a full-stack app"

settings:
  model: sonnet                      # optional: model override
  budget_per_agent: 5.00             # optional: USD cap per agent
  permissions: dangerously-skip      # dangerously-skip | accept-edits | default
  shared_context: [./ARCH.md]        # optional: files injected into all prompts

agents:
  - name: lead
    role: orchestrator
    instructions: |
      You are the team lead.
      1. Read {workspace}/board.md for the mission
      2. Break work into tasks in {workspace}/tasks/
      3. Assign tasks to team members
      4. Monitor progress via {workspace}/status/
      Delegate. Do NOT implement yourself.

  - name: builder-1
    role: implementer
    instructions: |
      Claim tasks from {workspace}/tasks/ and implement them.
      Update {workspace}/status/builder-1.md as you work.

  - name: reviewer
    role: reviewer
    instructions: |
      Review completed tasks for quality, security, and correctness.
      Post reviews to {workspace}/reviews/.
```

The `{workspace}` placeholder is replaced with the actual shared workspace path at launch.

## How It Works

1. **YAML → tmux**: `spawn up` reads your team definition and creates a tmux session with one pane per agent.
2. **Shared workspace**: A directory is created with `tasks/`, `status/`, `messages/`, `reviews/`, and `decisions/` subdirectories.
3. **Agent prompts**: Each agent gets a system prompt containing its identity, the team roster, and the workspace protocol.
4. **File-based collaboration**: Agents communicate by reading and writing markdown files in the shared workspace — no direct context sharing.
5. **State persistence**: Team state is saved to `~/.spawn/teams/{name}.json` for status tracking and teardown.

Each agent runs as an independent Claude Code process. The lead orchestrates by creating task files; workers claim and complete them; reviewers audit the output.

## Requirements

- **Node.js** >= 20
- **tmux** installed and available in PATH
- **Claude Code CLI** (`claude`) installed and authenticated

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

[MIT](LICENSE)
