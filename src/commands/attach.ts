import * as tmux from "../core/tmux.ts";
import * as stateManager from "../core/state.ts";
import { log } from "../utils/logger.ts";

interface AttachOptions {
  teamName?: string;
}

export async function attach(opts: AttachOptions): Promise<void> {
  let teamName = opts.teamName;

  if (!teamName) {
    const teams = await stateManager.listAll();
    if (teams.length === 0) {
      log.error("No running teams found.");
      process.exit(1);
    }
    if (teams.length === 1) {
      teamName = teams[0].teamName;
    } else {
      log.error("Multiple teams running. Specify one with --team-name:");
      for (const t of teams) {
        log.dim(`  ${t.teamName}`);
      }
      process.exit(1);
    }
  }

  const spawnState = await stateManager.load(teamName);

  if (!(await tmux.hasSession(spawnState.tmuxSession))) {
    log.error(`tmux session "${spawnState.tmuxSession}" not found. Team may have died.`);
    process.exit(1);
  }

  log.info(`Attaching to ${spawnState.tmuxSession}... (detach with Ctrl+B then D)`);
  await tmux.attach(spawnState.tmuxSession);
}
