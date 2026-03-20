import { exec, sleep } from "../utils/process.ts";

export async function hasSession(session: string): Promise<boolean> {
  try {
    await exec("tmux", ["has-session", "-t", session]);
    return true;
  } catch {
    return false;
  }
}

export async function createSession(session: string, cwd: string): Promise<void> {
  await exec("tmux", [
    "new-session", "-d", "-s", session, "-c", cwd, "-x", "220", "-y", "50",
  ]);
}

export async function splitPane(session: string): Promise<void> {
  await exec("tmux", ["split-window", "-t", session]);
}

export async function tileLayout(session: string): Promise<void> {
  await exec("tmux", ["select-layout", "-t", session, "tiled"]);
}

/**
 * Send text to a tmux pane. CRITICAL: text and Enter MUST be sent separately.
 * This is the #1 gotcha from the swarm guide — combining them garbles input.
 */
export async function sendKeys(target: string, text: string): Promise<void> {
  // -l flag sends literal text (prevents interpreting key names like "Enter", "Space")
  await exec("tmux", ["send-keys", "-t", target, "-l", text]);
}

export async function sendEnter(target: string): Promise<void> {
  await exec("tmux", ["send-keys", "-t", target, "Enter"]);
}

/** Send text then Enter with the required sleep between them. */
export async function sendLine(target: string, text: string): Promise<void> {
  await sendKeys(target, text);
  await sleep(500);
  await sendEnter(target);
}

export async function capturePane(
  target: string,
  lines = 50
): Promise<string> {
  return exec("tmux", [
    "capture-pane", "-t", target, "-p", "-S", `-${lines}`,
  ]);
}

export async function killSession(session: string): Promise<void> {
  await exec("tmux", ["kill-session", "-t", session]);
}

export async function listSessions(): Promise<string[]> {
  try {
    const out = await exec("tmux", ["list-sessions", "-F", "#{session_name}"]);
    return out.split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

export async function listPanes(session: string): Promise<string[]> {
  try {
    const out = await exec("tmux", [
      "list-panes", "-t", session, "-F", "#{pane_index}",
    ]);
    return out.split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

export async function attach(session: string): Promise<void> {
  const { execFileSync } = await import("node:child_process");
  execFileSync("tmux", ["attach-session", "-t", session], {
    stdio: "inherit",
  });
}

export async function paneIsRunning(target: string): Promise<boolean> {
  try {
    const cmd = await exec("tmux", [
      "display-message", "-t", target, "-p", "#{pane_current_command}",
    ]);
    return cmd !== "" && cmd !== "zsh" && cmd !== "bash";
  } catch {
    return false;
  }
}
