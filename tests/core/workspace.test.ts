import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  create,
  writeBoard,
  writePrompt,
  readAgentStatus,
  listTasks,
  listMessages,
  writeShutdownSignal,
} from "../../src/core/workspace.ts";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "spawn-test-ws-"));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("workspace", () => {
  describe("create()", () => {
    it("creates all subdirectories with baseDir", async () => {
      const ws = await create("test-team", tmpDir);
      expect(ws).toBe(path.join(tmpDir, ".spawn-workspace"));
      const expected = ["tasks", "status", "findings", "reviews", "decisions", "messages", ".spawn", ".spawn/prompts"];
      for (const sub of expected) {
        const stat = await fs.stat(path.join(ws, sub));
        expect(stat.isDirectory()).toBe(true);
      }
    });

    it("uses tmpdir when no baseDir", async () => {
      const ws = await create("my-team");
      expect(ws).toBe(path.join(os.tmpdir(), "spawn", "my-team"));
      const stat = await fs.stat(path.join(ws, "tasks"));
      expect(stat.isDirectory()).toBe(true);
      await fs.rm(ws, { recursive: true, force: true });
    });
  });

  describe("writeBoard()", () => {
    it("writes board.md with mission", async () => {
      const ws = await create("t", tmpDir);
      await writeBoard(ws, "Build something");
      const content = await fs.readFile(path.join(ws, "board.md"), "utf-8");
      expect(content).toContain("## Mission");
      expect(content).toContain("Build something");
    });

    it("includes task section when task provided", async () => {
      const ws = await create("t", tmpDir);
      await writeBoard(ws, "Mission X", "Fix the bug");
      const content = await fs.readFile(path.join(ws, "board.md"), "utf-8");
      expect(content).toContain("## Task");
      expect(content).toContain("Fix the bug");
    });

    it("omits task section when no task", async () => {
      const ws = await create("t", tmpDir);
      await writeBoard(ws, "Mission X");
      const content = await fs.readFile(path.join(ws, "board.md"), "utf-8");
      expect(content).not.toContain("## Task");
    });
  });

  describe("writePrompt()", () => {
    it("writes prompt file and returns path", async () => {
      const ws = await create("t", tmpDir);
      const p = await writePrompt(ws, "lead", "You are the lead");
      expect(p).toBe(path.join(ws, ".spawn", "prompts", "lead.md"));
      const content = await fs.readFile(p, "utf-8");
      expect(content).toBe("You are the lead");
    });
  });

  describe("readAgentStatus()", () => {
    it("returns content when file exists", async () => {
      const ws = await create("t", tmpDir);
      await fs.writeFile(path.join(ws, "status", "lead.md"), "Working on task 1");
      const result = await readAgentStatus(ws, "lead");
      expect(result).toBe("Working on task 1");
    });

    it("returns null when file is missing", async () => {
      const ws = await create("t", tmpDir);
      const result = await readAgentStatus(ws, "nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("listTasks()", () => {
    it("lists .md files in tasks dir", async () => {
      const ws = await create("t", tmpDir);
      await fs.writeFile(path.join(ws, "tasks", "001.md"), "# Task 1");
      await fs.writeFile(path.join(ws, "tasks", "002.md"), "# Task 2");
      await fs.writeFile(path.join(ws, "tasks", "notes.txt"), "not a task");
      const tasks = await listTasks(ws);
      expect(tasks).toHaveLength(2);
      expect(tasks.map((t) => t.file)).toContain("001.md");
      expect(tasks.map((t) => t.file)).toContain("002.md");
    });

    it("returns empty array when no tasks", async () => {
      const ws = await create("t", tmpDir);
      const tasks = await listTasks(ws);
      expect(tasks).toEqual([]);
    });
  });

  describe("listMessages()", () => {
    it("filters by agent name", async () => {
      const ws = await create("t", tmpDir);
      const msgDir = path.join(ws, "messages");
      await fs.writeFile(path.join(msgDir, "20260320-1000-lead-to-worker-1.md"), "Do this");
      await fs.writeFile(path.join(msgDir, "20260320-1001-lead-to-worker-2.md"), "Do that");
      const msgs = await listMessages(ws, "worker-1");
      expect(msgs).toHaveLength(1);
      expect(msgs[0].content).toBe("Do this");
    });

    it("includes broadcast messages", async () => {
      const ws = await create("t", tmpDir);
      const msgDir = path.join(ws, "messages");
      await fs.writeFile(path.join(msgDir, "20260320-1000-lead-broadcast.md"), "All hands");
      await fs.writeFile(path.join(msgDir, "20260320-1001-lead-to-worker-2.md"), "Private");
      const msgs = await listMessages(ws, "worker-1");
      expect(msgs).toHaveLength(1);
      expect(msgs[0].content).toBe("All hands");
    });

    it("returns all messages when no agent filter", async () => {
      const ws = await create("t", tmpDir);
      const msgDir = path.join(ws, "messages");
      await fs.writeFile(path.join(msgDir, "msg1.md"), "A");
      await fs.writeFile(path.join(msgDir, "msg2.md"), "B");
      const msgs = await listMessages(ws);
      expect(msgs).toHaveLength(2);
    });
  });

  describe("writeShutdownSignal()", () => {
    it("creates SHUTDOWN file in .spawn", async () => {
      const ws = await create("t", tmpDir);
      await writeShutdownSignal(ws);
      const content = await fs.readFile(path.join(ws, ".spawn", "SHUTDOWN"), "utf-8");
      expect(content).toBeTruthy();
    });
  });
});
