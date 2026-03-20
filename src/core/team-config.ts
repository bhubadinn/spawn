import fs from "node:fs/promises";
import YAML from "yaml";
import type { TeamConfig, AgentConfig } from "../types/index.ts";

export async function load(filePath: string): Promise<TeamConfig> {
  const raw = await fs.readFile(filePath, "utf-8");
  const parsed = YAML.parse(raw);
  return validate(parsed);
}

export function validate(raw: Record<string, unknown>): TeamConfig {
  if (!raw.name || typeof raw.name !== "string") {
    throw new Error("team.yaml: 'name' is required (string)");
  }
  if (!raw.agents || !Array.isArray(raw.agents) || raw.agents.length === 0) {
    throw new Error("team.yaml: 'agents' array is required with at least one agent");
  }

  for (const [i, agent] of (raw.agents as Record<string, unknown>[]).entries()) {
    if (!agent.name) throw new Error(`team.yaml: agents[${i}].name is required`);
    if (!agent.instructions) throw new Error(`team.yaml: agents[${i}].instructions is required`);
    if (!agent.role) (agent as Record<string, unknown>).role = "worker";
  }

  const settings = (raw.settings ?? {}) as Record<string, unknown>;

  return {
    name: raw.name as string,
    description: (raw.description as string) ?? "",
    dir: raw.dir as string | undefined,
    task: raw.task as string | undefined,
    settings: {
      model: settings.model as string | undefined,
      budget_per_agent: settings.budget_per_agent as number | undefined,
      permissions: (settings.permissions as TeamConfig["settings"]["permissions"]) ?? "dangerously-skip",
      shared_context: settings.shared_context as string[] | undefined,
    },
    agents: raw.agents as AgentConfig[],
  };
}

/** Generate a quick team config when --agents N is used without a YAML file. */
export function generate(
  count: number,
  task?: string,
  model?: string
): TeamConfig {
  const agents: AgentConfig[] = [];

  agents.push({
    name: "lead",
    role: "orchestrator",
    instructions: `You are the team lead. Your job:
1. Read the board at {workspace}/board.md for the team mission
2. Break the work into tasks — create files in {workspace}/tasks/ (one per task)
3. Assign tasks to agents by setting "Assigned: <agent-name>" in the task file
4. Monitor {workspace}/status/ for agent progress
5. Coordinate, unblock, and make decisions when agents disagree
6. When all tasks are done, write COMPLETE to {workspace}/status/lead.md

Delegate implementation. Do NOT code yourself unless the team is stuck.`,
  });

  for (let i = 1; i < count; i++) {
    agents.push({
      name: `worker-${i}`,
      role: "implementer",
      instructions: `You are worker-${i}, an implementer. Your job:
1. Check {workspace}/tasks/ for tasks assigned to you (Assigned: worker-${i})
2. If no tasks assigned, check for unassigned tasks and claim one by setting Assigned: worker-${i}
3. Implement the task fully — no shortcuts, no placeholders
4. Update the task file status to "done" when complete
5. Update your status at {workspace}/status/worker-${i}.md
6. Post messages to {workspace}/messages/ if you need help or have findings
7. Look for new tasks and repeat`,
    });
  }

  return {
    name: `team-${Date.now().toString(36)}`,
    description: task ?? "Collaborative work team",
    task,
    settings: {
      permissions: "dangerously-skip",
      model,
    },
    agents,
  };
}
