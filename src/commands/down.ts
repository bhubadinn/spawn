import * as tmux from "../core/tmux.ts";
import * as workspace from "../core/workspace.ts";
import * as stateManager from "../core/state.ts";
import { tmuxSessionName } from "../utils/paths.ts";
import { sleep } from "../utils/process.ts";
import { log } from "../utils/logger.ts";

interface DownOptions {
  teamName?: string;
  force?: boolean;
}

async function resolveTeamName(opts: DownOptions): Promise<string> {
  if (opts.teamName) return opts.teamName;

  // Try to find a single running team
  const teams = await stateManager.listAll();
  if (teams.length === 0) {
    log.error("No running teams found.");
    process.exit(1);
  }
  if (teams.length === 1) return teams[0].teamName;

  log.error("Multiple teams running. Specify one with --team-name:");
  for (const t of teams) {
    log.dim(`  ${t.teamName} (${t.agents.length} agents, started ${t.startedAt})`);
  }
  process.exit(1);
}

export async function down(opts: DownOptions): Promise<void> {
  const teamName = await resolveTeamName(opts);
  const session = tmuxSessionName(teamName);

  let spawnState;
  try {
    spawnState = await stateManager.load(teamName);
  } catch {
    log.warn(`No state file for "${teamName}". Attempting to kill tmux session directly.`);
    if (await tmux.hasSession(session)) {
      await tmux.killSession(session);
      log.ok(`Killed tmux session: ${session}`);
    } else {
      log.error(`No tmux session "${session}" found either.`);
    }
    return;
  }

  if (!opts.force) {
    // Graceful shutdown: signal agents
    log.info("Sending shutdown signal...");
    await workspace.writeShutdownSignal(spawnState.workspace);

    for (const agent of spawnState.agents) {
      try {
        const shutdownMsg =
          "The team is shutting down. Finish your current task, commit any work, update your status file, then type /exit to quit.";
        await tmux.sendKeys(agent.pane, shutdownMsg);
        await sleep(500);
        await tmux.sendEnter(agent.pane);
      } catch {
        // pane may already be dead
      }
    }

    log.info("Waiting for agents to wrap up (15s)...");
    await sleep(15000);
  }

  // Kill tmux session
  if (await tmux.hasSession(session)) {
    await tmux.killSession(session);
    log.ok(`Killed tmux session: ${session}`);
  }

  // Clean up state
  await stateManager.remove(teamName);
  log.ok(`Removed state for: ${teamName}`);

  log.dim(`Workspace preserved at: ${spawnState.workspace}`);
  log.ok("Team shut down.");
}
