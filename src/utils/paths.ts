import path from "node:path";
import os from "node:os";

export const SPAWN_HOME = path.join(os.homedir(), ".spawn");
export const TEAMS_DIR = path.join(SPAWN_HOME, "teams");

export function teamStatePath(teamName: string): string {
  return path.join(TEAMS_DIR, `${teamName}.json`);
}

export function tmuxSessionName(teamName: string): string {
  return `spawn-${teamName}`;
}
