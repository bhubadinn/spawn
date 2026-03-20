import * as tmux from "../core/tmux.ts";
import * as workspace from "../core/workspace.ts";
import * as stateManager from "../core/state.ts";
import { log } from "../utils/logger.ts";
import chalk from "chalk";

interface StatusOptions {
  teamName?: string;
}

async function resolveTeamName(opts: StatusOptions): Promise<string> {
  if (opts.teamName) return opts.teamName;

  const teams = await stateManager.listAll();
  if (teams.length === 0) {
    log.error("No running teams found.");
    process.exit(1);
  }
  if (teams.length === 1) return teams[0].teamName;

  log.error("Multiple teams running. Specify one with --team-name:");
  for (const t of teams) {
    log.dim(`  ${t.teamName}`);
  }
  process.exit(1);
}

export async function status(opts: StatusOptions): Promise<void> {
  const teamName = await resolveTeamName(opts);

  let spawnState;
  try {
    spawnState = await stateManager.load(teamName);
  } catch {
    log.error(`No state found for team "${teamName}".`);
    process.exit(1);
  }

  const sessionAlive = await tmux.hasSession(spawnState.tmuxSession);
  const uptime = Date.now() - new Date(spawnState.startedAt).getTime();
  const mins = Math.floor(uptime / 60000);

  log.header(`Team: ${spawnState.teamName}`);
  log.dim(`  Session:   ${spawnState.tmuxSession} ${sessionAlive ? chalk.green("(alive)") : chalk.red("(dead)")}`);
  log.dim(`  Workspace: ${spawnState.workspace}`);
  log.dim(`  Project:   ${spawnState.projectDir}`);
  log.dim(`  Uptime:    ${mins}m`);
  console.log();

  // Agent status
  for (const agent of spawnState.agents) {
    const running = sessionAlive ? await tmux.paneIsRunning(agent.pane) : false;
    const statusText = await workspace.readAgentStatus(spawnState.workspace, agent.name);
    const statusLine = statusText
      ? statusText.split("\n").filter(Boolean)[0]?.substring(0, 80) ?? "no status"
      : "no status file";

    const stateIcon = running ? chalk.green("running") : chalk.red("stopped");
    console.log(
      `  ${chalk.cyan(agent.name.padEnd(15))} ${stateIcon.padEnd(20)} ${chalk.dim(agent.role.padEnd(15))} ${chalk.dim(statusLine)}`
    );
  }

  // Task summary
  const tasks = await workspace.listTasks(spawnState.workspace);
  if (tasks.length > 0) {
    let pending = 0, inProgress = 0, done = 0;
    for (const t of tasks) {
      if (t.content.includes("Status: done")) done++;
      else if (t.content.includes("Status: in-progress")) inProgress++;
      else pending++;
    }
    console.log();
    log.dim(`  Tasks: ${tasks.length} total | ${done} done | ${inProgress} in-progress | ${pending} pending`);
  }

  // Messages
  const messages = await workspace.listMessages(spawnState.workspace);
  if (messages.length > 0) {
    log.dim(`  Messages: ${messages.length}`);
  }
}
