# Claude Code Swarm Setup Guide
*Compiled from: Reddit r/ClaudeAI, kieranklaassen SKILL.md, rhnvrm blog, Addy Osmani article, Michael Tomcal LinkedIn*

---

## Overview: Three Approaches

| Approach | Complexity | Cost | Best For |
|----------|-----------|------|----------|
| **Ralph Wiggum Loop** | Simple bash | Low (sequential) | Overnight batch work, impl plans |
| **tmux Manual Swarm** | Medium | Medium | Interactive multi-agent, visible output |
| **TeammateTool (Official)** | High | High (parallel instances) | Complex parallel work with cross-agent comms |

Pick based on the job. For most overnight autonomous work, Ralph Wiggum Loop is the right choice.

---

## Approach 1: Ralph Wiggum Loop (Recommended Starting Point)

The simplest, most battle-tested pattern. One agent. Headless Claude Code. A bash loop. Built 3,000 lines of Python in 2-3 hours of actual human time with 94% test coverage.

### How It Works

```
IMPLEMENTATION_PLAN.md → claude --headless → detect /done → commit → next task → repeat
```

### Setup

**1. Create your IMPLEMENTATION_PLAN.md**
```markdown
# Implementation Plan

## Phase 1: Core Feature
- [ ] Task 1: Set up database schema for users table
- [ ] Task 2: Create CRUD endpoints for user resource
- [ ] Task 3: Add JWT authentication middleware
- [ ] Task 4: Write unit tests for all endpoints

## Phase 2: Hardening
- [ ] Task 5: Add input validation
- [ ] Task 6: Add rate limiting
- [ ] Task 7: Push coverage to >90%
```

**2. Create your PROMPT.md**
```markdown
You are an autonomous developer working through IMPLEMENTATION_PLAN.md.

INSTRUCTIONS:
1. Read IMPLEMENTATION_PLAN.md
2. Find the next unchecked task (- [ ])
3. Read any relevant spec files in /specs/ if they exist
4. Implement the task fully — no shortcuts, no placeholders
5. Run tests if applicable
6. Check the task off in IMPLEMENTATION_PLAN.md (change - [ ] to - [x])
7. git add + git commit with a clear message
8. Print /done when finished

RULES:
- Never leave code incomplete
- Never skip tests
- If you get stuck, document the blocker in BLOCKERS.md and still print /done
- Commit after every task, not at the end
```

**3. Create loop.sh** (the Ralph Wiggum)
```bash
#!/bin/bash
# loop.sh — Run Claude Code headlessly in a loop
# Usage: ./loop.sh [max_iterations]

MAX=${1:-50}
LOG_DIR="./logs/ralph"
mkdir -p "$LOG_DIR"

echo "Starting Ralph Wiggum loop. Max iterations: $MAX"
echo "Watching: IMPLEMENTATION_PLAN.md"

for i in $(seq 1 $MAX); do
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    LOG_FILE="$LOG_DIR/iter_${i}_${TIMESTAMP}.log"

    echo ""
    echo "=== ITERATION $i / $MAX ==="
    echo "Log: $LOG_FILE"

    # Run Claude headlessly with PROMPT.md as the task
    claude --dangerously-skip-permissions -p "$(cat PROMPT.md)" 2>&1 | tee "$LOG_FILE"

    # Check if Claude printed /done
    if grep -q "/done" "$LOG_FILE"; then
        echo "✓ Iteration $i complete"

        # Check if all tasks done
        REMAINING=$(grep -c "\- \[ \]" IMPLEMENTATION_PLAN.md 2>/dev/null || echo 0)
        if [ "$REMAINING" -eq 0 ]; then
            echo ""
            echo "✅ All tasks complete!"
            break
        fi

        echo "  Remaining tasks: $REMAINING"
    else
        echo "⚠ No /done signal detected. Checking for blockers..."
        if grep -q "BLOCKER" "$LOG_FILE"; then
            echo "❌ Blocker found. Check BLOCKERS.md"
            break
        fi
    fi

    # Rate limit buffer
    sleep 3
done

echo ""
echo "Loop finished. Review logs in $LOG_DIR/"
```

**4. Optional: Pre-commit hook for quality gate**

`.git/hooks/pre-commit`:
```bash
#!/bin/bash
# Enforce test coverage before commit
if [ -f "package.json" ]; then
    npm test -- --coverage --coverageThreshold='{"global":{"lines":90}}' 2>&1
    if [ $? -ne 0 ]; then
        echo "❌ Tests failed or coverage below 90%. Commit blocked."
        exit 1
    fi
fi
```

**5. Run it**
```bash
chmod +x loop.sh .git/hooks/pre-commit
./loop.sh 30   # up to 30 iterations
```

### Director Pattern (for long overnight runs)

Start a second Claude instance as a Director to watch the loop and handle rate limits:

```bash
# Terminal 1: The loop
tmux new-session -s ralph -d "bash loop.sh 100"

# Terminal 2: Director Claude watching the loop
tmux new-window -t ralph -n director
# In the director pane, launch claude and give it this system prompt:
```

**DIRECTOR.md** (give this to the director agent):
```markdown
You are the Director. Your job is to keep the Ralph Wiggum loop running.

Monitor: tail -f logs/ralph/*.log

If you see rate limit errors:
1. Wait 60 seconds
2. Restart the loop: bash loop.sh 50

If you see a BLOCKER:
1. Read BLOCKERS.md
2. Attempt to resolve the blocker yourself
3. Remove from BLOCKERS.md
4. Restart the loop

If all tasks complete: report done and exit.

Check logs every 30 seconds.
```

---

## Approach 2: tmux Manual Swarm

Multiple Claude Code instances in named tmux panes. Orchestrator manages workers via `send-keys`. Workers signal completion via `.done` files.

### Setup

**1. Create tmux session structure**
```bash
# Create the swarm session
tmux new-session -s swarm -d

# Window 0: Orchestrator
tmux rename-window -t swarm:0 "orchestrator"

# Window 1: Workers (2x2 grid)
tmux new-window -t swarm:1 -n "workers"
tmux split-window -t swarm:workers -h
tmux split-window -t swarm:workers.0 -v
tmux split-window -t swarm:workers.1 -v

# Layout: 4 equal panes
tmux select-layout -t swarm:workers tiled
```

**2. Launch Claude in orchestrator**
```bash
tmux send-keys -t swarm:orchestrator "claude --dangerously-skip-permissions" Enter
```

**3. Create ORCHESTRATOR.md**
```markdown
You are the Orchestrator managing a tmux swarm. Workers are in window "workers".

Pane addresses: swarm:workers.0, swarm:workers.1, swarm:workers.2, swarm:workers.3

ASSIGNING WORK:
1. Read PLAN.md for unchecked tasks
2. Find a free pane (check if .done file exists for it)
3. Send the task to the pane:
   - CRITICAL: Send text and Enter as SEPARATE commands
   - Step 1: tmux send-keys -t swarm:workers.N "your task instructions here"
   - Step 2 (separate): tmux send-keys -t swarm:workers.N "Enter"
   - NEVER combine text + Enter in one command

MONITORING:
- Workers create ./done/pane_N.done when finished
- Check: ls ./done/
- Read worker output: tmux capture-pane -t swarm:workers.N -p

FLOW:
1. Check which panes are free
2. Assign next unchecked task
3. Check every 60 seconds for completions
4. Mark task done in PLAN.md when .done file appears
5. Assign new task to freed pane
6. Repeat until all tasks done
```

**4. Create WORKER.md** (instructions given to each worker)
```markdown
You are Worker in pane [PANE_NUMBER].

Your task: [TASK DESCRIPTION]

When done:
1. Commit your work: git add -A && git commit -m "..."
2. Create completion file: mkdir -p done && touch done/pane_[PANE_NUMBER].done
3. Print DONE

Do not wait for confirmation. Work autonomously.
```

**5. Attach and run**
```bash
tmux attach-session -t swarm
# In orchestrator pane, start Claude and tell it to follow ORCHESTRATOR.md
```

### Critical tmux Inter-Agent Communication Rule

```bash
# ❌ WRONG — newline breaks things
tmux send-keys -t swarm:workers.0 "do the task\n"

# ✅ CORRECT — text first, Enter separate
tmux send-keys -t swarm:workers.0 "do the task"
sleep 1
tmux send-keys -t swarm:workers.0 "Enter"
```

---

## Approach 3: Official TeammateTool (CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS)

The native Anthropic agent teams feature. Each teammate is a full independent Claude Code instance. Use when you need agents that actually communicate with each other, challenge each other, share findings.

### Enable

In `~/.claude/settings.json`:
```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

### Core Concepts

| Component | What It Is |
|-----------|-----------|
| **Team Lead** | The Claude session that creates and manages the team |
| **Teammates** | Separate Claude instances, each with own context window |
| **Task List** | Shared work items at `~/.claude/tasks/{team}/` |
| **Mailbox** | Inbox files at `~/.claude/teams/{team}/inboxes/` |

### Quick Start

```javascript
// 1. Create team (you become team lead)
Teammate({ operation: "spawnTeam", team_name: "my-team" })

// 2. Spawn workers (ALL in one message = parallel)
Task({
  team_name: "my-team",
  name: "researcher",
  subagent_type: "Explore",
  prompt: "Research X. When done: Teammate({ operation: 'write', target_agent_id: 'team-lead', value: 'findings here' })",
  run_in_background: true
})

Task({
  team_name: "my-team",
  name: "implementer",
  subagent_type: "general-purpose",
  prompt: "Implement Y. Send results to team-lead when done.",
  run_in_background: true
})

// 3. Check inbox (read file directly)
// cat ~/.claude/teams/my-team/inboxes/team-lead.json

// 4. Shutdown (ALWAYS do this before cleanup)
Teammate({ operation: "requestShutdown", target_agent_id: "researcher" })
Teammate({ operation: "requestShutdown", target_agent_id: "implementer" })
// Wait for shutdown_approved messages...

// 5. Cleanup
Teammate({ operation: "cleanup" })
```

### Agent Types Available

```javascript
// Built-in
subagent_type: "general-purpose"    // Full Claude, can do anything
subagent_type: "Explore"            // Read-only, search/analysis
subagent_type: "Plan"               // Architecture and planning

// Compound Engineering plugin (if installed)
subagent_type: "compound-engineering:review:security-sentinel"
subagent_type: "compound-engineering:review:performance-oracle"
subagent_type: "compound-engineering:review:architecture-strategist"
subagent_type: "compound-engineering:research:best-practices-researcher"
subagent_type: "compound-engineering:research:git-history-analyzer"
```

### Three Patterns

**Pattern A: Parallel Specialists** — Same problem, different lenses simultaneously

```javascript
Teammate({ operation: "spawnTeam", team_name: "review-pr" })

// All spawned in ONE message (runs in parallel)
Task({ team_name: "review-pr", name: "security", subagent_type: "general-purpose",
  prompt: "Review auth.php for SQL injection, XSS, and auth bypass. Send findings to team-lead.",
  run_in_background: true
})
Task({ team_name: "review-pr", name: "performance", subagent_type: "general-purpose",
  prompt: "Review auth.php for N+1 queries, memory leaks. Send findings to team-lead.",
  run_in_background: true
})
Task({ team_name: "review-pr", name: "simplicity", subagent_type: "general-purpose",
  prompt: "Review auth.php for over-engineering and YAGNI violations. Send findings to team-lead.",
  run_in_background: true
})
// Lead synthesizes all three when done
```

**Pattern B: Pipeline** — Sequential stages with auto-unblocking

```javascript
Teammate({ operation: "spawnTeam", team_name: "feature-build" })

// Create tasks
TaskCreate({ subject: "Research", description: "Research best auth patterns" })     // #1
TaskCreate({ subject: "Plan", description: "Design implementation" })               // #2
TaskCreate({ subject: "Implement", description: "Build it" })                       // #3
TaskCreate({ subject: "Test", description: "Write and run tests" })                 // #4

// Wire dependencies (auto-unblocks when previous completes)
TaskUpdate({ taskId: "2", addBlockedBy: ["1"] })
TaskUpdate({ taskId: "3", addBlockedBy: ["2"] })
TaskUpdate({ taskId: "4", addBlockedBy: ["3"] })

// Workers poll TaskList and self-claim
Task({ team_name: "feature-build", name: "researcher", subagent_type: "Explore",
  prompt: "Claim task #1 (TaskUpdate owner+status). Do the research. Complete it. Notify team-lead.",
  run_in_background: true
})
// ... more workers for each stage
```

**Pattern C: Swarm** — Many independent tasks, workers race to claim

```javascript
Teammate({ operation: "spawnTeam", team_name: "doc-swarm" })

// Create pool of independent tasks
const files = ["user.php", "auth.php", "api.php", "payment.php", "bot.php"]
for (const f of files) {
  TaskCreate({ subject: `Document ${f}`, description: `Write JSDoc for all functions in ${f}` })
}

// Worker self-loop prompt (same for all workers)
const workerPrompt = `
You are a swarm worker. Loop:
1. TaskList() — find pending task with no owner
2. Claim: TaskUpdate({ taskId: "X", owner: "$CLAUDE_CODE_AGENT_NAME", status: "in_progress" })
3. Do the work
4. Complete: TaskUpdate({ taskId: "X", status: "completed" })
5. Notify: Teammate({ operation: "write", target_agent_id: "team-lead", value: "done X" })
6. Go to step 1. If no tasks found 3x in a row: exit.
`

// Spawn 3 workers to race through the pool
Task({ team_name: "doc-swarm", name: "w1", subagent_type: "general-purpose", prompt: workerPrompt, run_in_background: true })
Task({ team_name: "doc-swarm", name: "w2", subagent_type: "general-purpose", prompt: workerPrompt, run_in_background: true })
Task({ team_name: "doc-swarm", name: "w3", subagent_type: "general-purpose", prompt: workerPrompt, run_in_background: true })
```

### Task System API

```javascript
TaskCreate({ subject: "Do X", description: "Full details", activeForm: "Working on X..." })
TaskList()                                           // See all tasks + status
TaskGet({ taskId: "1" })                             // Get one task
TaskUpdate({ taskId: "1", owner: "worker-1" })       // Claim
TaskUpdate({ taskId: "1", status: "in_progress" })   // Start
TaskUpdate({ taskId: "1", status: "completed" })     // Done
TaskUpdate({ taskId: "2", addBlockedBy: ["1"] })     // Set dependency
```

### Teammate Communication

```javascript
// Message one agent
Teammate({ operation: "write", target_agent_id: "researcher", value: "Reprioritize to focus on X" })

// Message ALL (expensive — N messages for N agents, use sparingly)
Teammate({ operation: "broadcast", name: "team-lead", value: "Stop what you're doing — critical issue found" })
```

### Shutdown Sequence (Always Do This)

```javascript
// 1. Request shutdown for each teammate
Teammate({ operation: "requestShutdown", target_agent_id: "worker-1", reason: "All tasks done" })
Teammate({ operation: "requestShutdown", target_agent_id: "worker-2", reason: "All tasks done" })

// 2. Wait for {"type": "shutdown_approved"} in inbox
// cat ~/.claude/teams/my-team/inboxes/team-lead.json

// 3. Then cleanup (fails if any teammate still active)
Teammate({ operation: "cleanup" })
```

### Important Limitations

- One team per session, no nested teams
- Teammates cannot spawn sub-teammates
- Teammates don't inherit leader's conversation history — put everything they need in the spawn prompt
- No session resumption for in-process teammates after /resume
- Task status can lag — teammates sometimes forget to mark tasks done
- `broadcast` is expensive — use `write` to specific agents
- Heartbeat timeout: 5 minutes. Crashed workers auto-mark inactive after timeout
- Permissions propagate from lead — if lead has `--dangerously-skip-permissions`, all teammates do too

---

## tmux Persistent Claude Sessions (Quality of Life)

Never lose a Claude session when closing your terminal. Each project directory gets its own persistent Claude instance.

Add to `~/.config/tmux/tmux.conf` or `~/.tmux.conf`:
```bash
# Press prefix+y to open/resume Claude for current directory
bind -r y run-shell '\
  SESSION="claude-$(echo #{pane_current_path} | md5sum | cut -c1-8)"; \
  tmux has-session -t "$SESSION" 2>/dev/null || \
  tmux new-session -d -s "$SESSION" -c "#{pane_current_path}" "claude --dangerously-skip-permissions"; \
  tmux display-popup -w80% -h80% -E "tmux attach-session -t $SESSION"'
```

How it works:
- Hashes working directory path → unique session name (e.g. `claude-a1b2c3d4`)
- If session exists: opens popup attached to it (resumes conversation)
- If new: creates session with Claude already running
- Closing popup does NOT kill Claude — it runs in background
- Each directory = its own persistent Claude session

---

## Display Modes for TeammateTool

**In-process (default)** — teammates run in background, no visible output
```bash
# Default when not inside tmux
# Toggle task list: Ctrl+T
# Select teammate: Shift+Up/Down
# Message them: type directly
```

**tmux split panes** — see all agents working simultaneously
```json
// settings.json
{
  "teammateMode": "tmux"
}
```
```bash
# Or per session:
claude --teammate-mode tmux
```

**Force backend explicitly:**
```bash
export CLAUDE_CODE_SPAWN_BACKEND=tmux        # Visible panes, persistent
export CLAUDE_CODE_SPAWN_BACKEND=in-process  # Background, fastest
```

---

## Plan Approval Workflow (Before Risky Changes)

For work where you want to review what an agent plans to do before it does it:

```javascript
// Spawn agent in plan mode
Task({
  team_name: "careful-work",
  name: "architect",
  subagent_type: "Plan",
  mode: "plan",    // Agent must get approval before acting
  prompt: "Plan the refactor of auth module at /src/auth/",
  run_in_background: true
})

// You'll receive this in inbox:
// { "type": "plan_approval_request", "from": "architect", "requestId": "plan-xyz", "planContent": "..." }

// Approve
Teammate({ operation: "approvePlan", target_agent_id: "architect", request_id: "plan-xyz" })

// Or reject with feedback
Teammate({ operation: "rejectPlan", target_agent_id: "architect", request_id: "plan-xyz",
  feedback: "Must include rollback steps and test coverage plan" })
```

---

## Debugging

```bash
# Check team state
cat ~/.claude/teams/{team-name}/config.json | jq '.members[] | {name, agentType, backendType}'

# Read agent inbox
cat ~/.claude/teams/{team-name}/inboxes/team-lead.json | jq '.'

# Watch for new messages in real-time
tail -f ~/.claude/teams/{team-name}/inboxes/team-lead.json

# Check task states
cat ~/.claude/tasks/{team-name}/*.json | jq '{id, subject, status, owner}'

# List all active teams
ls ~/.claude/teams/

# Check which backend was selected
cat ~/.claude/teams/{team}/config.json | jq '.members[].backendType'

# Check if inside tmux
echo $TMUX
```

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot cleanup with active members` | Teammates still running | `requestShutdown` all first |
| `Already leading a team` | Team already exists | `cleanup` or use different team name |
| `Agent not found` | Wrong teammate name | Check `config.json` for actual names |
| `team_name is required` | Missing context | Add `team_name` param |

---

## Recommended Files Structure for a Swarm Project

```
project/
├── IMPLEMENTATION_PLAN.md   # Checklist of tasks (Ralph Wiggum target)
├── PROMPT.md                # Instructions for each Claude iteration
├── ORCHESTRATOR.md          # Instructions for the director/orchestrator
├── WORKER.md                # Template for worker agents
├── BLOCKERS.md              # Auto-created when agent gets stuck
├── specs/                   # Detailed spec per feature/task
│   ├── auth-spec.md
│   └── api-spec.md
├── loop.sh                  # Ralph Wiggum loop script
├── logs/
│   └── ralph/               # Per-iteration logs
└── done/                    # Completion signal files (pane_N.done)
```

---

## Decision Tree: Which Approach to Use

```
Is the work sequential? (each task depends on previous result)
├── YES → Ralph Wiggum Loop (simplest, cheapest)
│
└── NO → Can tasks run independently?
    ├── YES, many similar tasks → Swarm Pattern (workers race to claim)
    ├── YES, different expertise per task → Parallel Specialists
    └── NO, need agents to debate/challenge each other → TeammateTool with broadcast
```

**Rule of thumb:** Start with Ralph Wiggum. If you need parallelism, add tmux swarm. Only use TeammateTool when you genuinely need agents talking to each other (competing hypotheses, adversarial review).

---

## Key Rules (Don't Skip These)

1. **Teammates can't see your conversation history** — put all context in spawn prompt
2. **Text output from teammates is invisible** — they MUST use `Teammate.write()` to communicate
3. **Two separate commands for tmux send-keys** — text first, Enter second, sleep in between
4. **Always shutdown before cleanup** — cleanup will fail with active members
5. **broadcast = N API calls** — use write() to specific agents for normal comms
6. **One team per session** — clean up before starting new team
7. **No nested teams** — teammates cannot spawn sub-teams
8. **Leader sometimes implements instead of delegating** — use Shift+Tab (delegate mode) to lock it to coordination only

---

*Based on: Claude Code v2.1.19 + community workflows as of 2026-01-25 to 2026-02-20*
