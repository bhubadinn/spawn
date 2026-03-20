import fs from "node:fs/promises";
import path from "node:path";
import { SPAWN_HOME, TEAMS_DIR, teamStatePath } from "../utils/paths.ts";
import type { SpawnState } from "../types/index.ts";

async function ensureDir(): Promise<void> {
  await fs.mkdir(TEAMS_DIR, { recursive: true });
}

export async function save(state: SpawnState): Promise<void> {
  await ensureDir();
  await fs.writeFile(teamStatePath(state.teamName), JSON.stringify(state, null, 2));
}

export async function load(teamName: string): Promise<SpawnState> {
  const raw = await fs.readFile(teamStatePath(teamName), "utf-8");
  return JSON.parse(raw) as SpawnState;
}

export async function remove(teamName: string): Promise<void> {
  try {
    await fs.unlink(teamStatePath(teamName));
  } catch {
    // already removed
  }
}

export async function listAll(): Promise<SpawnState[]> {
  await ensureDir();
  const files = await fs.readdir(TEAMS_DIR);
  const states: SpawnState[] = [];
  for (const file of files.filter((f) => f.endsWith(".json"))) {
    try {
      const raw = await fs.readFile(path.join(TEAMS_DIR, file), "utf-8");
      states.push(JSON.parse(raw) as SpawnState);
    } catch {
      // skip corrupt state files
    }
  }
  return states;
}
