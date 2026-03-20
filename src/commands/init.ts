import fs from "node:fs/promises";
import path from "node:path";
import { log } from "../utils/logger.ts";
import { runInitWizard } from "../wizard/index.ts";

const TEMPLATE = `name: my-team
description: "Describe the team mission here"

settings:
  model: sonnet              # optional: sonnet, opus, haiku
  # budget_per_agent: 5.00   # optional: USD cap per agent
  permissions: dangerously-skip
  # shared_context:          # optional: files to include in every agent's prompt
  #   - ./ARCHITECTURE.md

agents:
  - name: lead
    role: orchestrator
    instructions: |
      You are the team lead. Your job:
      1. Read {workspace}/board.md for the mission
      2. Break work into tasks in {workspace}/tasks/
      3. Assign tasks to team members
      4. Monitor progress via {workspace}/status/
      5. Make decisions when the team disagrees
      Delegate. Do NOT implement yourself.

  - name: researcher
    role: explorer
    instructions: |
      You explore the codebase and gather information.
      Post findings to {workspace}/findings/.
      Claim tasks assigned to you in {workspace}/tasks/.

  - name: builder
    role: implementer
    instructions: |
      You implement features and fix bugs.
      Claim tasks from {workspace}/tasks/.
      Update {workspace}/status/builder.md as you work.
      Commit code with clear messages.

  - name: reviewer
    role: reviewer
    instructions: |
      You review code quality, security, and correctness.
      Watch for completed tasks in {workspace}/tasks/.
      Post reviews to {workspace}/reviews/.
      Create new tasks if you find issues.
`;

interface InitOptions {
  yes?: boolean;
}

export async function init(opts: InitOptions): Promise<void> {
  // Interactive wizard unless -y/--yes flag
  if (!opts.yes) {
    try {
      await runInitWizard();
    } catch (err: unknown) {
      if (err != null && typeof err === "object" && "name" in err && (err as { name: string }).name === "ExitPromptError") {
        log.dim("Aborted.");
        return;
      }
      throw err;
    }
    return;
  }

  // Static template mode (-y)
  const dest = path.resolve("team.yaml");
  try {
    await fs.access(dest);
    log.error("team.yaml already exists in this directory.");
    process.exit(1);
  } catch {
    // file doesn't exist, good
  }

  await fs.writeFile(dest, TEMPLATE);
  log.ok(`Created team.yaml`);
  log.dim("  Edit it to define your team, then run: spawn up");
}
