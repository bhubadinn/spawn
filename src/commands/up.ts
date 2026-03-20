import path from "node:path";
import * as tmux from "../core/tmux.ts";
import * as workspace from "../core/workspace.ts";
import * as teamConfig from "../core/team-config.ts";
import * as promptBuilder from "../core/prompt-builder.ts";
import * as state from "../core/state.ts";
import { tmuxSessionName } from "../utils/paths.ts";
import { sleep } from "../utils/process.ts";
import { log } from "../utils/logger.ts";
import type { TeamConfig, SpawnState } from "../types/index.ts";

interface UpOptions {
  team?: string;
  agents?: number;
  task?: string;
  dir?: string;
  model?: string;
  budget?: number;
  detach?: boolean;
}

export async function up(opts: UpOptions): Promise<void> {
  // 1. Load or generate team config
  let config: TeamConfig;

  if (opts.team) {
    const teamPath = path.resolve(opts.team);
    log.info(`Loading team from ${teamPath}`);
    config = await teamConfig.load(teamPath);
  } else if (opts.agents) {
    log.info(`Generating team with ${opts.agents} agents`);
    config = teamConfig.generate(opts.agents, opts.task, opts.model);
  } else {
    // Try ./team.yaml by default
    try {
      config = await teamConfig.load(path.resolve("team.yaml"));
      log.info("Loaded team.yaml from current directory");
    } catch {
      log.error("No --team file or --agents count specified, and no team.yaml found.");
      log.dim("  Usage: spawn up --team team.yaml");
      log.dim("  Usage: spawn up --agents 3 --task 'Build a REST API'");
      process.exit(1);
    }
  }

  // Apply CLI overrides
  if (opts.model) config.settings.model = opts.model;
  if (opts.budget) config.settings.budget_per_agent = opts.budget;

  const sessionName = tmuxSessionName(config.name);
  const projectDir = path.resolve(opts.dir ?? config.dir ?? ".");

  // 2. Check prerequisites
  if (await tmux.hasSession(sessionName)) {
    log.error(`Team "${config.name}" is already running (session: ${sessionName})`);
    log.dim("  Use: spawn down    to stop it");
    log.dim("  Use: spawn attach  to reconnect");
    process.exit(1);
  }

  // 3. Create workspace
  const ws = await workspace.create(config.name, opts.dir ? projectDir : undefined);
  await workspace.writeBoard(ws, config.description ?? "", config.task);
  log.ok(`Workspace: ${ws}`);

  // 4. Create tmux session
  await tmux.createSession(sessionName, projectDir);
  log.ok(`tmux session: ${sessionName}`);

  // 5. Create panes (first pane already exists)
  for (let i = 1; i < config.agents.length; i++) {
    await tmux.splitPane(sessionName);
  }
  if (config.agents.length > 1) {
    await tmux.tileLayout(sessionName);
  }
  log.ok(`Created ${config.agents.length} panes`);

  // 6. Build prompts and launch agents
  const agentStates: SpawnState["agents"] = [];

  for (let i = 0; i < config.agents.length; i++) {
    const agent = config.agents[i];
    const pane = `${sessionName}:0.${i}`;

    // Build system prompt and write to file
    const prompt = await promptBuilder.build(agent, config, ws, projectDir);
    const promptPath = await workspace.writePrompt(ws, agent.name, prompt);

    // Build claude command — use --append-system-prompt to inject team protocol
    // This way Claude already knows its identity/team/workspace when it starts
    const parts = [
      "claude",
      "--append-system-prompt",
      `"$(cat ${promptPath})"`,
    ];

    if (config.settings.permissions === "dangerously-skip") {
      parts.push("--dangerously-skip-permissions");
    }

    const agentModel = agent.model ?? config.settings.model;
    if (agentModel) parts.push("--model", agentModel);

    const agentBudget = agent.budget ?? config.settings.budget_per_agent;
    if (agentBudget) parts.push("--max-budget-usd", String(agentBudget));

    const cmd = parts.join(" ");

    // Unset CLAUDECODE to avoid nested session error
    await tmux.sendLine(pane, "unset CLAUDECODE");
    await sleep(500);

    // Launch Claude with system prompt
    log.agent(agent.name, `Launching in pane ${i}...`);
    await tmux.sendLine(pane, cmd);

    agentStates.push({ name: agent.name, role: agent.role, pane });
  }

  // 7. Wait for Claude instances to fully initialize
  log.info("Waiting for Claude instances to initialize...");
  await sleep(8000);

  // 8. Send opening message to each agent
  for (let i = 0; i < config.agents.length; i++) {
    const agent = config.agents[i];
    const pane = `${sessionName}:0.${i}`;

    // Short message — the full protocol is already in the system prompt
    const openingMessage = `Begin. Read ${ws}/board.md then start working.`;

    await tmux.sendKeys(pane, openingMessage);
    await sleep(500);
    await tmux.sendEnter(pane);
    await sleep(2000);

    log.agent(agent.name, "Prompt sent");
  }

  // 9. Save state
  const spawnState: SpawnState = {
    teamName: config.name,
    tmuxSession: sessionName,
    workspace: ws,
    projectDir,
    agents: agentStates,
    startedAt: new Date().toISOString(),
    configPath: opts.team ? path.resolve(opts.team) : undefined,
  };
  await state.save(spawnState);

  // 10. Summary
  log.header("Team spawned!");
  log.dim(`  Name:      ${config.name}`);
  log.dim(`  Session:   ${sessionName}`);
  log.dim(`  Workspace: ${ws}`);
  log.dim(`  Agents:    ${config.agents.map((a) => `${a.name} (${a.role})`).join(", ")}`);
  log.dim(`  Project:   ${projectDir}`);
  console.log();
  log.info("Attach with: spawn attach");
  log.info("Status with: spawn status");
  log.info("Stop with:   spawn down");

  // 11. Attach unless --detach
  if (!opts.detach) {
    console.log();
    log.info("Attaching to tmux session... (detach with Ctrl+B then D)");
    await tmux.attach(sessionName);
  }
}
