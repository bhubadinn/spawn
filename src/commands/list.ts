import * as tmux from "../core/tmux.ts";
import * as stateManager from "../core/state.ts";
import { log } from "../utils/logger.ts";
import chalk from "chalk";

export async function list(): Promise<void> {
  const teams = await stateManager.listAll();

  if (teams.length === 0) {
    log.info("No teams running.");
    return;
  }

  log.header("Active Teams");
  console.log();

  for (const team of teams) {
    const alive = await tmux.hasSession(team.tmuxSession);
    const uptime = Math.floor((Date.now() - new Date(team.startedAt).getTime()) / 60000);

    const stateStr = alive ? chalk.green("alive") : chalk.red("dead");
    console.log(
      `  ${chalk.bold(team.teamName.padEnd(25))} ${stateStr.padEnd(15)} ${String(team.agents.length).padEnd(3)} agents   ${uptime}m   ${chalk.dim(team.workspace)}`
    );
  }
}
