import { describe, it, expect } from "vitest";
import path from "node:path";
import os from "node:os";
import { tmuxSessionName, teamStatePath, SPAWN_HOME, TEAMS_DIR } from "../../src/utils/paths.ts";

describe("paths", () => {
  it("SPAWN_HOME is ~/.spawn", () => {
    expect(SPAWN_HOME).toBe(path.join(os.homedir(), ".spawn"));
  });

  it("TEAMS_DIR is ~/.spawn/teams", () => {
    expect(TEAMS_DIR).toBe(path.join(os.homedir(), ".spawn", "teams"));
  });

  it("tmuxSessionName returns spawn-{name}", () => {
    expect(tmuxSessionName("my-team")).toBe("spawn-my-team");
  });

  it("teamStatePath returns correct path", () => {
    expect(teamStatePath("my-team")).toBe(
      path.join(os.homedir(), ".spawn", "teams", "my-team.json")
    );
  });
});
