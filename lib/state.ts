import fs from "fs/promises";
import path from "path";

const STATE_FILE = path.join(process.cwd(), "vibepanel-state.json");

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: "running" | "stopped" | "paused";
  ports: string;
  created: string;
  memory: string;
  cpu: string;
  env: string[];
}

export interface PM2Process {
  id: string;
  name: string;
  lang: string;
  status: "online" | "stopped" | "errored";
  instances: number;
  memory: string;
  cpu: string;
  restarts: number;
  uptime: string;
  path: string;
  logs: string[];
}

export interface ProxyRule {
  id: string;
  domain: string;
  target: string;
  ssl: boolean;
  sslExpiry: string;
  status: "active" | "error";
}

export interface VibePanelState {
  containers: DockerContainer[];
  processes: PM2Process[];
  proxyRules: ProxyRule[];
}

const DEFAULT_STATE: VibePanelState = {
  containers: [],
  processes: [],
  proxyRules: [],
};

export async function readState(): Promise<VibePanelState> {
  try {
    const data = await fs.readFile(STATE_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    await writeState(DEFAULT_STATE);
    return DEFAULT_STATE;
  }
}

export async function writeState(state: VibePanelState): Promise<void> {
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}
