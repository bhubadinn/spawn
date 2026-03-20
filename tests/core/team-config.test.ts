import { describe, it, expect } from "vitest";
import path from "node:path";
import { validate, generate, load } from "../../src/core/team-config.ts";

describe("team-config", () => {
  describe("validate()", () => {
    const minimal = () => ({
      name: "my-team",
      agents: [{ name: "a1", instructions: "do stuff" }],
    });

    it("returns TeamConfig for valid input", () => {
      const cfg = validate(minimal());
      expect(cfg.name).toBe("my-team");
      expect(cfg.agents).toHaveLength(1);
      expect(cfg.settings.permissions).toBe("dangerously-skip");
    });

    it("throws when name is missing", () => {
      expect(() => validate({ agents: [{ name: "a", instructions: "x" }] } as any)).toThrow(
        "'name' is required"
      );
    });

    it("throws when agents is empty", () => {
      expect(() => validate({ name: "t", agents: [] })).toThrow(
        "'agents' array is required"
      );
    });

    it("throws when agents is missing", () => {
      expect(() => validate({ name: "t" } as any)).toThrow("'agents' array is required");
    });

    it("throws when agent missing name", () => {
      expect(() =>
        validate({ name: "t", agents: [{ instructions: "x" }] } as any)
      ).toThrow("agents[0].name is required");
    });

    it("throws when agent missing instructions", () => {
      expect(() =>
        validate({ name: "t", agents: [{ name: "a" }] } as any)
      ).toThrow("agents[0].instructions is required");
    });

    it("defaults role to 'worker'", () => {
      const cfg = validate(minimal());
      expect(cfg.agents[0].role).toBe("worker");
    });

    it("preserves explicit role", () => {
      const raw = minimal();
      (raw.agents[0] as any).role = "orchestrator";
      const cfg = validate(raw);
      expect(cfg.agents[0].role).toBe("orchestrator");
    });

    it("defaults permissions to 'dangerously-skip'", () => {
      const cfg = validate(minimal());
      expect(cfg.settings.permissions).toBe("dangerously-skip");
    });

    it("passes through settings when provided", () => {
      const raw = {
        ...minimal(),
        settings: { model: "opus", permissions: "accept-edits" },
      };
      const cfg = validate(raw);
      expect(cfg.settings.model).toBe("opus");
      expect(cfg.settings.permissions).toBe("accept-edits");
    });
  });

  describe("generate()", () => {
    it("creates lead + N-1 workers", () => {
      const cfg = generate(3);
      expect(cfg.agents).toHaveLength(3);
      expect(cfg.agents[0].name).toBe("lead");
      expect(cfg.agents[0].role).toBe("orchestrator");
      expect(cfg.agents[1].name).toBe("worker-1");
      expect(cfg.agents[2].name).toBe("worker-2");
    });

    it("sets task in description when provided", () => {
      const cfg = generate(2, "Fix the bug");
      expect(cfg.description).toBe("Fix the bug");
      expect(cfg.task).toBe("Fix the bug");
    });

    it("uses default description when no task", () => {
      const cfg = generate(2);
      expect(cfg.description).toBe("Collaborative work team");
    });

    it("passes model through", () => {
      const cfg = generate(2, undefined, "opus");
      expect(cfg.settings.model).toBe("opus");
    });
  });

  describe("load()", () => {
    it("reads and parses a YAML file", async () => {
      const fixturePath = path.join(import.meta.dirname, "..", "fixtures", "team.yaml");
      const cfg = await load(fixturePath);
      expect(cfg.name).toBe("test-team");
      expect(cfg.agents).toHaveLength(2);
      expect(cfg.agents[0].name).toBe("lead");
      expect(cfg.settings.model).toBe("sonnet");
      expect(cfg.settings.permissions).toBe("accept-edits");
    });
  });
});
