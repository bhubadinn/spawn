import { Command } from "commander";
import { up } from "./commands/up.ts";
import { down } from "./commands/down.ts";
import { status } from "./commands/status.ts";
import { attach } from "./commands/attach.ts";
import { logs } from "./commands/logs.ts";
import { list } from "./commands/list.ts";
import { init } from "./commands/init.ts";

export function createCli(): Command {
  const program = new Command();

  program
    .name("spawn")
    .description("Spawn collaborative Claude Code agent teams in tmux")
    .version("0.1.0");

  program
    .command("up")
    .description("Create and start a team")
    .option("-t, --team <file>", "Path to team.yaml definition")
    .option("-n, --agents <count>", "Quick mode: spawn N agents", parseInt)
    .option("--task <description>", "Task for quick mode")
    .option("-d, --dir <path>", "Working directory for agents")
    .option("-c, --create-dir <name>", "Create a new project directory and spawn there")
    .option("-m, --model <model>", "Override model for all agents")
    .option("--budget <usd>", "Max budget per agent in USD", parseFloat)
    .option("--detach", "Don't attach to tmux after creation")
    .action(up);

  program
    .command("down")
    .description("Teardown a running team")
    .option("--team-name <name>", "Team name to stop")
    .option("-f, --force", "Kill immediately without graceful shutdown")
    .action(down);

  program
    .command("status")
    .description("Show team state")
    .option("--team-name <name>", "Team name")
    .action(status);

  program
    .command("attach")
    .description("Attach to a team's tmux session")
    .option("--team-name <name>", "Team name")
    .action(attach);

  program
    .command("logs")
    .description("View agent output")
    .option("--team-name <name>", "Team name")
    .option("-a, --agent <name>", "Specific agent name")
    .option("-l, --lines <count>", "Number of lines", parseInt)
    .action(logs);

  program
    .command("list")
    .description("List all active teams")
    .action(list);

  program
    .command("init")
    .description("Generate a starter team.yaml")
    .action(init);

  return program;
}
