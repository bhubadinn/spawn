export interface AgentConfig {
  name: string;
  role: string;
  instructions: string;
  model?: string;
  budget?: number;
}

export interface TeamSettings {
  model?: string;
  budget_per_agent?: number;
  permissions: "dangerously-skip" | "accept-edits" | "default";
  shared_context?: string[];
}

export interface TeamConfig {
  name: string;
  description?: string;
  dir?: string;
  task?: string;
  settings: TeamSettings;
  agents: AgentConfig[];
}

export interface AgentState {
  name: string;
  role: string;
  pane: string;
}

export interface SpawnState {
  teamName: string;
  tmuxSession: string;
  workspace: string;
  projectDir: string;
  agents: AgentState[];
  startedAt: string;
  configPath?: string;
}
