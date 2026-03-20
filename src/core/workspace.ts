import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const SUBDIRS = ["tasks", "status", "findings", "reviews", "decisions", "messages", ".spawn", ".spawn/prompts"];

export async function create(teamName: string, baseDir?: string): Promise<string> {
  const workspace = baseDir
    ? path.join(baseDir, ".spawn-workspace")
    : path.join(os.tmpdir(), "spawn", teamName);

  for (const sub of SUBDIRS) {
    await fs.mkdir(path.join(workspace, sub), { recursive: true });
  }

  return workspace;
}

export async function writeBoard(
  workspace: string,
  description: string,
  task?: string
): Promise<void> {
  let content = `# Team Board\n\n## Mission\n${description}\n`;
  if (task) {
    content += `\n## Task\n${task}\n`;
  }
  content += `\n## Updates\n_Board created at ${new Date().toISOString()}_\n`;
  await fs.writeFile(path.join(workspace, "board.md"), content);
}

export async function writePrompt(
  workspace: string,
  agentName: string,
  prompt: string
): Promise<string> {
  const promptPath = path.join(workspace, ".spawn", "prompts", `${agentName}.md`);
  await fs.writeFile(promptPath, prompt);
  return promptPath;
}

export async function readAgentStatus(
  workspace: string,
  agentName: string
): Promise<string | null> {
  try {
    return await fs.readFile(
      path.join(workspace, "status", `${agentName}.md`),
      "utf-8"
    );
  } catch {
    return null;
  }
}

export async function listTasks(
  workspace: string
): Promise<Array<{ file: string; content: string }>> {
  const tasksDir = path.join(workspace, "tasks");
  try {
    const files = await fs.readdir(tasksDir);
    const results = [];
    for (const file of files.filter((f) => f.endsWith(".md"))) {
      const content = await fs.readFile(path.join(tasksDir, file), "utf-8");
      results.push({ file, content });
    }
    return results;
  } catch {
    return [];
  }
}

export async function listMessages(
  workspace: string,
  agentName?: string
): Promise<Array<{ file: string; content: string }>> {
  const msgDir = path.join(workspace, "messages");
  try {
    const files = await fs.readdir(msgDir);
    const filtered = agentName
      ? files.filter((f) => f.includes(`to-${agentName}`) || f.includes("broadcast"))
      : files;
    const results = [];
    for (const file of filtered.filter((f) => f.endsWith(".md"))) {
      const content = await fs.readFile(path.join(msgDir, file), "utf-8");
      results.push({ file, content });
    }
    return results;
  } catch {
    return [];
  }
}

export async function writeShutdownSignal(workspace: string): Promise<void> {
  await fs.writeFile(
    path.join(workspace, ".spawn", "SHUTDOWN"),
    new Date().toISOString()
  );
}
