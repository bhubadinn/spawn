import path from "node:path";
import fs from "node:fs/promises";
import YAML from "yaml";
import { input, select, confirm, number, editor } from "@inquirer/prompts";
import { log } from "../utils/logger.ts";

interface AgentDef {
  name: string;
  role: string;
  instructions: string;
}

interface WizardResult {
  name: string;
  description: string;
  model: string;
  permissions: string;
  budget_per_agent?: number;
  shared_context?: string[];
  agents: AgentDef[];
}

export async function runInitWizard(): Promise<void> {
  const dest = path.resolve("team.yaml");

  // Check if team.yaml exists — ask to overwrite
  try {
    await fs.access(dest);
    const overwrite = await confirm({
      message: "team.yaml already exists. Overwrite?",
      default: false,
    });
    if (!overwrite) {
      log.dim("Aborted.");
      return;
    }
  } catch {
    // file doesn't exist, good
  }

  log.header("spawn init — Team Setup Wizard");
  console.log();

  // 1. Team name
  const teamName = await input({
    message: "Team name",
    default: path.basename(process.cwd()),
  });

  // 2. Description
  const description = await input({
    message: "Description (team mission)",
    default: "Collaborative work team",
  });

  // 3. Model
  const model = await select({
    message: "Model",
    choices: [
      { name: "sonnet", value: "sonnet" },
      { name: "opus", value: "opus" },
      { name: "haiku", value: "haiku" },
    ],
    default: "sonnet",
  });

  // 4. Permissions
  const permissions = await select({
    message: "Permissions",
    choices: [
      { name: "dangerously-skip (agents run without approval)", value: "dangerously-skip" },
      { name: "accept-edits (agents can edit files)", value: "accept-edits" },
      { name: "default (agents ask for approval)", value: "default" },
    ],
    default: "dangerously-skip",
  });

  // 5. Budget
  let budget_per_agent: number | undefined;
  const wantBudget = await confirm({
    message: "Set a budget cap per agent?",
    default: false,
  });
  if (wantBudget) {
    budget_per_agent = await number({
      message: "Budget per agent (USD)",
      default: 5,
      min: 0.01,
    });
  }

  // 6. Shared context
  const sharedContextRaw = await input({
    message: "Shared context files (comma-separated paths, or leave empty)",
    default: "",
  });
  const shared_context = sharedContextRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // 7. Agent loop
  const agents: AgentDef[] = [];
  let addMore = true;

  while (addMore) {
    const agentNum = agents.length + 1;
    console.log();
    log.info(`Agent #${agentNum}`);

    const agentName = await input({
      message: "  Name",
      default: agents.length === 0 ? "lead" : `worker-${agents.length}`,
    });

    const role = await select({
      message: "  Role",
      choices: [
        { name: "orchestrator", value: "orchestrator" },
        { name: "implementer", value: "implementer" },
        { name: "explorer", value: "explorer" },
        { name: "reviewer", value: "reviewer" },
        { name: "custom", value: "custom" },
      ],
      default: agents.length === 0 ? "orchestrator" : "implementer",
    });

    const finalRole =
      role === "custom"
        ? await input({ message: "  Custom role name" })
        : role;

    const instructions = await editor({
      message: "  Instructions (opens $EDITOR)",
      default: getDefaultInstructions(agentName, finalRole),
    });

    agents.push({ name: agentName, role: finalRole, instructions: instructions.trim() });
    log.ok(`Added agent: ${agentName} (${finalRole})`);

    if (agents.length < 1) continue; // shouldn't happen but safety

    const wantMore = await confirm({
      message: "Add another agent?",
      default: agents.length < 2,
    });

    if (!wantMore) {
      if (agents.length < 1) {
        log.warn("At least 1 agent is required. Let's add one more.");
      } else {
        addMore = false;
      }
    }
  }

  // 8. Build YAML
  const config: Record<string, unknown> = {
    name: teamName,
    description,
    settings: {
      model,
      permissions,
      ...(budget_per_agent != null ? { budget_per_agent } : {}),
      ...(shared_context.length > 0 ? { shared_context } : {}),
    },
    agents: agents.map((a) => ({
      name: a.name,
      role: a.role,
      instructions: a.instructions,
    })),
  };

  const yamlStr = YAML.stringify(config, { lineWidth: 0 });

  // 9. Preview
  console.log();
  log.header("Preview:");
  console.log(yamlStr);

  // 10. Confirm & write
  const doWrite = await confirm({
    message: "Write team.yaml?",
    default: true,
  });

  if (!doWrite) {
    log.dim("Aborted.");
    return;
  }

  await fs.writeFile(dest, yamlStr);
  log.ok("Created team.yaml");
  log.dim("  Run: spawn up");
}

function getDefaultInstructions(name: string, role: string): string {
  switch (role) {
    case "orchestrator":
      return `You are the team lead. Your job:
1. Read {workspace}/board.md for the mission
2. Break work into tasks in {workspace}/tasks/
3. Assign tasks to team members
4. Monitor progress via {workspace}/status/
5. Make decisions when the team disagrees
Delegate. Do NOT implement yourself.`;
    case "implementer":
      return `You are ${name}, an implementer. Your job:
1. Check {workspace}/tasks/ for tasks assigned to you
2. Implement tasks fully — no shortcuts, no placeholders
3. Update task status to "done" when complete
4. Update your status at {workspace}/status/${name}.md
5. Post to {workspace}/messages/ if you need help`;
    case "explorer":
      return `You explore the codebase and gather information.
Post findings to {workspace}/findings/.
Claim tasks assigned to you in {workspace}/tasks/.`;
    case "reviewer":
      return `You review code quality, security, and correctness.
Watch for completed tasks in {workspace}/tasks/.
Post reviews to {workspace}/reviews/.
Create new tasks if you find issues.`;
    default:
      return `You are ${name}. Describe your instructions here.`;
  }
}
