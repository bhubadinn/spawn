import path from "node:path";
import fs from "node:fs/promises";
import { select, input } from "@inquirer/prompts";
import { log } from "../utils/logger.ts";
import { runInitWizard } from "./init-wizard.ts";

export interface UpWizardResult {
  mode: "yaml" | "quick" | "init";
  teamFile?: string;
  agents?: number;
  task?: string;
  model?: string;
}

export async function runUpWizard(): Promise<UpWizardResult | null> {
  const hasTeamYaml = await fileExists(path.resolve("team.yaml"));

  const choices: { name: string; value: string }[] = [];
  if (hasTeamYaml) {
    choices.push({ name: "Use ./team.yaml", value: "yaml" });
  }
  choices.push(
    { name: "Quick mode (N agents)", value: "quick" },
    { name: "Create new team (run init wizard)", value: "init" },
  );

  log.header("spawn up — No team specified");
  console.log();

  const mode = await select({
    message: "How would you like to start?",
    choices,
  });

  if (mode === "yaml") {
    return { mode: "yaml", teamFile: path.resolve("team.yaml") };
  }

  if (mode === "init") {
    await runInitWizard();
    // After init wizard, check if team.yaml was created
    if (await fileExists(path.resolve("team.yaml"))) {
      return { mode: "yaml", teamFile: path.resolve("team.yaml") };
    }
    return null; // user aborted
  }

  // Quick mode
  const agentCount = await input({
    message: "Number of agents",
    default: "3",
    validate: (v) => {
      const n = parseInt(v, 10);
      return n >= 1 && n <= 20 ? true : "Enter a number between 1 and 20";
    },
  });

  const task = await input({
    message: "Task description",
    default: "",
  });

  const model = await select({
    message: "Model",
    choices: [
      { name: "sonnet", value: "sonnet" },
      { name: "opus", value: "opus" },
      { name: "haiku", value: "haiku" },
    ],
    default: "sonnet",
  });

  return {
    mode: "quick",
    agents: parseInt(agentCount, 10),
    task: task || undefined,
    model,
  };
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
