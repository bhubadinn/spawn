import * as tmux from "../core/tmux.ts";
import * as stateManager from "../core/state.ts";
import { log } from "../utils/logger.ts";
import chalk from "chalk";

interface LogsOptions {
  teamName?: string;
  agent?: string;
  lines?: number;
}

export async function logs(opts: LogsOptions): Promise<void> {
  let teamName = opts.teamName;

  if (!teamName) {
    const teams = await stateManager.listAll();
    if (teams.length === 0) {
      log.error("No running teams found.");
      process.exit(1);
    }
    teamName = teams.length === 1 ? teams[0].teamName : undefined;
    if (!teamName) {
      log.error("Multiple teams running. Specify --team-name.");
      process.exit(1);
    }
  }

  const spawnState = await stateManager.load(teamName);
  const lineCount = opts.lines ?? 30;

  const agents = opts.agent
    ? spawnState.agents.filter((a) => a.name === opts.agent)
    : spawnState.agents;

  if (agents.length === 0) {
    log.error(`Agent "${opts.agent}" not found. Available: ${spawnState.agents.map((a) => a.name).join(", ")}`);
    process.exit(1);
  }

  for (const agent of agents) {
    console.log(chalk.cyan.bold(`\n=== ${agent.name} (${agent.role}) ===`));
    try {
      const output = await tmux.capturePane(agent.pane, lineCount);
      console.log(output || chalk.dim("(empty)"));
    } catch {
      console.log(chalk.red("(pane not available)"));
    }
  }
}
