import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { SpawnState } from "../../src/types/index.ts";

let tmpDir: string;

// Mock paths.ts to use a temp directory instead of ~/.spawn
vi.mock("../../src/utils/paths.ts", async () => {
  // tmpDir isn't set yet at import time, so we use a getter pattern
  const p = await import("node:path");
  const o = await import("node:os");

  // We'll set this in beforeEach via the module
  let _teamsDir = "";
  return {
    get SPAWN_HOME() {
      return path.dirname(_teamsDir);
    },
    get TEAMS_DIR() {
      return _teamsDir;
    },
    teamStatePath: (teamName: string) => p.default.join(_teamsDir, `${teamName}.json`),
    tmuxSessionName: (teamName: string) => `spawn-${teamName}`,
    _setTeamsDir: (dir: string) => {
      _teamsDir = dir;
    },
  };
});

const { save, load, remove, listAll } = await import("../../src/core/state.ts");
const pathsMock: any = await import("../../src/utils/paths.ts");

const makeState = (name = "test-team"): SpawnState => ({
  teamName: name,
  tmuxSession: `spawn-${name}`,
  workspace: "/tmp/spawn/test",
  projectDir: "/tmp/project",
  agents: [{ name: "lead", role: "orchestrator", pane: "%0" }],
  startedAt: new Date().toISOString(),
});

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "spawn-test-state-"));
  const teamsDir = path.join(tmpDir, "teams");
  await fs.mkdir(teamsDir, { recursive: true });
  pathsMock._setTeamsDir(teamsDir);
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("state", () => {
  it("save() + load() roundtrips state", async () => {
    const state = makeState();
    await save(state);
    const loaded = await load("test-team");
    expect(loaded.teamName).toBe("test-team");
    expect(loaded.agents).toHaveLength(1);
    expect(loaded.workspace).toBe(state.workspace);
  });

  it("remove() deletes state file", async () => {
    const state = makeState();
    await save(state);
    await remove("test-team");
    await expect(load("test-team")).rejects.toThrow();
  });

  it("remove() does not error if already removed", async () => {
    await expect(remove("nonexistent")).resolves.toBeUndefined();
  });

  it("listAll() lists all saved states", async () => {
    await save(makeState("team-a"));
    await save(makeState("team-b"));
    const all = await listAll();
    expect(all).toHaveLength(2);
    const names = all.map((s) => s.teamName);
    expect(names).toContain("team-a");
    expect(names).toContain("team-b");
  });

  it("listAll() skips corrupt JSON files", async () => {
    await save(makeState("good"));
    await fs.writeFile(path.join(pathsMock.TEAMS_DIR, "bad.json"), "not json{{{");
    const all = await listAll();
    expect(all).toHaveLength(1);
    expect(all[0].teamName).toBe("good");
  });
});
