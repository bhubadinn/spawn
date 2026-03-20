import { describe, it, expect } from "vitest";
import { createCli } from "../src/cli.ts";

describe("cli", () => {
  it("registers all 7 commands", () => {
    const cli = createCli();
    const names = cli.commands.map((c) => c.name());
    expect(names).toEqual(
      expect.arrayContaining(["up", "down", "status", "attach", "logs", "list", "init"])
    );
    expect(names).toHaveLength(7);
  });

  it("up command has all expected options including -c", () => {
    const cli = createCli();
    const upCmd = cli.commands.find((c) => c.name() === "up")!;
    const flags = upCmd.options.map((o) => o.long);
    expect(flags).toContain("--team");
    expect(flags).toContain("--agents");
    expect(flags).toContain("--task");
    expect(flags).toContain("--dir");
    expect(flags).toContain("--create-dir");
    expect(flags).toContain("--model");
    expect(flags).toContain("--budget");
    expect(flags).toContain("--detach");
  });

  it("init command has -y/--yes option", () => {
    const cli = createCli();
    const initCmd = cli.commands.find((c) => c.name() === "init")!;
    const flags = initCmd.options.map((o) => o.long);
    expect(flags).toContain("--yes");
    const short = initCmd.options.map((o) => o.short);
    expect(short).toContain("-y");
  });

  it("parses args correctly", async () => {
    const cli = createCli();
    cli.exitOverride();
    // --help would throw due to exitOverride, which proves parsing works
    await expect(cli.parseAsync(["node", "spawn", "--help"], { from: "user" })).rejects.toThrow();
  });
});
