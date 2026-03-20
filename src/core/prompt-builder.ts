import fs from "node:fs/promises";
import path from "node:path";
import type { AgentConfig, TeamConfig } from "../types/index.ts";

/** Build the full system prompt for an agent, with team awareness and workspace protocol. */
export async function build(
  agent: AgentConfig,
  team: TeamConfig,
  workspace: string,
  projectDir: string
): Promise<string> {
  const roster = team.agents
    .map((a) => `- **${a.name}** (${a.role})${a.name === agent.name ? " ← you" : ""}`)
    .join("\n");

  let sharedContext = "";
  if (team.settings.shared_context?.length) {
    for (const file of team.settings.shared_context) {
      const absPath = path.isAbsolute(file) ? file : path.join(projectDir, file);
      try {
        const content = await fs.readFile(absPath, "utf-8");
        sharedContext += `\n### ${path.basename(file)}\n\`\`\`\n${content}\n\`\`\`\n`;
      } catch {
        sharedContext += `\n### ${path.basename(file)}\n_File not found: ${absPath}_\n`;
      }
    }
  }

  const instructions = agent.instructions.replace(/\{workspace\}/g, workspace);

  return `# You are ${agent.name} — ${agent.role}

You are part of a team of AI agents collaborating on a project.
Your working directory is: ${projectDir}

## Your Team
${roster}

## Workspace: ${workspace}
This is your shared workspace. ALL team members read and write here to collaborate.
You MUST actively check the workspace for new messages, task updates, and status changes.

### How to communicate

**Post a message to a specific agent:**
Write a markdown file to ${workspace}/messages/ named:
  YYYYMMDD-HHMM-{your-name}-to-{target}.md

**Broadcast to all agents:**
Write to ${workspace}/messages/YYYYMMDD-HHMM-{your-name}-broadcast.md

**Check for messages addressed to you:**
Look for files in ${workspace}/messages/ containing "to-${agent.name}" or "broadcast"

**Update your status** (do this often):
Write to ${workspace}/status/${agent.name}.md with what you're doing, what you need, and any blockers.

### How tasks work

Tasks live in: ${workspace}/tasks/
Each task is a markdown file with this format:

\`\`\`
# Task: <title>
Status: pending | in-progress | done | blocked
Assigned: <agent-name> | unassigned
Priority: P0 | P1 | P2

## Description
<what needs to be done>

## Notes
<progress, added by the assigned agent>
\`\`\`

- To claim a task: change Assigned to your name and Status to in-progress
- To complete: change Status to done and add completion notes
- To create a new task: add a new numbered file in ${workspace}/tasks/

### How decisions work

When the team needs to agree on something:
1. Any agent creates a file in ${workspace}/decisions/ describing the question
2. Other agents add their input to the same file
3. The lead (orchestrator) makes the final call, or consensus is reached
4. The decision file is updated with the outcome

### Rules
- Check ${workspace}/messages/ and ${workspace}/tasks/ regularly
- Always update your status file when starting or finishing work
- Commit code changes with clear messages using git
- If you get stuck, post a message to the lead or broadcast for help
- Read other agents' status files to understand what's happening
- Do NOT duplicate work another agent is already doing
- Coordinate through the workspace, not through assumptions
${team.task ? `\n### Team Mission\n${team.task}\n` : ""}
## Your Instructions
${instructions}
${sharedContext ? `\n## Shared Context\n${sharedContext}` : ""}`;
}
