import { describe, it, expect } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { build } from "../../src/core/prompt-builder.ts";
import type { AgentConfig, TeamConfig } from "../../src/types/index.ts";

function makeTeam(overrides?: Partial<TeamConfig>): TeamConfig {
  return {
    name: "test-team",
    description: "Test mission",
    settings: { permissions: "dangerously-skip" },
    agents: [
      { name: "lead", role: "orchestrator", instructions: "Lead instructions at {workspace}" },
      { name: "worker-1", role: "implementer", instructions: "Worker instructions at {workspace}" },
    ],
    ...overrides,
  };
}

describe("prompt-builder", () => {
  it("includes agent name and role", async () => {
    const team = makeTeam();
    const prompt = await build(team.agents[0], team, "/ws", "/project");
    expect(prompt).toContain("# You are lead — orchestrator");
  });

  it("includes team roster with '← you' marker", async () => {
    const team = makeTeam();
    const prompt = await build(team.agents[0], team, "/ws", "/project");
    expect(prompt).toContain("**lead** (orchestrator) ← you");
    expect(prompt).toContain("**worker-1** (implementer)");
    expect(prompt).not.toContain("worker-1 (implementer) ← you");
  });

  it("replaces {workspace} placeholder in instructions", async () => {
    const team = makeTeam();
    const prompt = await build(team.agents[0], team, "/my/workspace", "/project");
    expect(prompt).toContain("Lead instructions at /my/workspace");
    expect(prompt).not.toContain("{workspace}");
  });

  it("includes shared context when provided", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "spawn-test-pb-"));
    await fs.writeFile(path.join(tmpDir, "ARCH.md"), "# Architecture\nSome content");
    const team = makeTeam({ settings: { permissions: "dangerously-skip", shared_context: ["ARCH.md"] } });
    const prompt = await build(team.agents[0], team, "/ws", tmpDir);
    expect(prompt).toContain("## Shared Context");
    expect(prompt).toContain("# Architecture");
    expect(prompt).toContain("Some content");
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("handles missing shared context file gracefully", async () => {
    const team = makeTeam({ settings: { permissions: "dangerously-skip", shared_context: ["missing.md"] } });
    const prompt = await build(team.agents[0], team, "/ws", "/nonexistent");
    expect(prompt).toContain("## Shared Context");
    expect(prompt).toContain("File not found");
  });

  it("includes team task when set", async () => {
    const team = makeTeam({ task: "Fix all the bugs" });
    const prompt = await build(team.agents[0], team, "/ws", "/project");
    expect(prompt).toContain("### Team Mission");
    expect(prompt).toContain("Fix all the bugs");
  });

  it("omits team mission section when no task", async () => {
    const team = makeTeam();
    const prompt = await build(team.agents[0], team, "/ws", "/project");
    expect(prompt).not.toContain("### Team Mission");
  });
});
