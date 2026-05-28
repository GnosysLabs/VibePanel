import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";

const execAsync = promisify(exec);

async function isPm2Active(): Promise<boolean> {
  try {
    await execAsync("pm2 --version");
    return true;
  } catch {
    return false;
  }
}

async function tailLogFile(filePath: string, lineCount: number = 10): Promise<string[]> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return content.trim().split("\n").slice(-lineCount);
  } catch {
    return [];
  }
}

export async function GET() {
  const active = await isPm2Active();

  if (!active) {
    return NextResponse.json({ active: false, processes: [] });
  }

  try {
    const { stdout } = await execAsync("pm2 jlist");
    const rawProcesses = JSON.parse(stdout);

    const processes = await Promise.all(
      rawProcesses.map(async (p: any) => {
        const memBytes = p.monit?.memory || 0;
        const memory = memBytes ? `${Math.round(memBytes / (1024 * 1024))} MB` : "0 MB";
        const cpu = p.monit?.cpu !== undefined ? `${p.monit.cpu.toFixed(1)}%` : "0.0%";

        let uptime = "stopped";
        if (p.pm2_env?.status === "online" && p.pm2_env?.pm_uptime) {
          const diffMs = Date.now() - p.pm2_env.pm_uptime;
          const diffSecs = Math.floor(diffMs / 1000);
          const diffMins = Math.floor(diffSecs / 60);
          const diffHours = Math.floor(diffMins / 60);
          const diffDays = Math.floor(diffHours / 24);

          if (diffDays > 0) {
            uptime = `${diffDays}d ${diffHours % 24}h`;
          } else if (diffHours > 0) {
            uptime = `${diffHours}h ${diffMins % 60}m`;
          } else if (diffMins > 0) {
            uptime = `${diffMins}m`;
          } else {
            uptime = `${diffSecs}s`;
          }
        }

        let logs: string[] = [];
        if (p.pm2_env?.pm_out_log_path) {
          const outLogs = await tailLogFile(p.pm2_env.pm_out_log_path, 8);
          logs = logs.concat(outLogs);
        }
        if (p.pm2_env?.pm_err_log_path) {
          const errLogs = await tailLogFile(p.pm2_env.pm_err_log_path, 8);
          logs = logs.concat(errLogs.map(l => `[ERROR] ${l}`));
        }

        if (logs.length === 0) {
          logs = [`[PM2] No log entries found. Process id: ${p.pm_id}`];
        }

        return {
          id: String(p.pm_id),
          name: p.name || "unknown",
          lang: p.pm2_env?.node_version ? `Node.js (${p.pm2_env.node_version})` : p.pm2_env?.exec_mode || "fork",
          status: p.pm2_env?.status === "online" ? "online" : p.pm2_env?.status === "errored" ? "errored" : "stopped",
          instances: p.pm2_env?.instances || 1,
          memory,
          cpu,
          restarts: p.pm2_env?.restart_time || 0,
          uptime,
          path: p.pm2_env?.pm_exec_path || "unknown",
          logs,
        };
      })
    );

    return NextResponse.json({ active: true, processes });
  } catch {
    return NextResponse.json({ active: false, processes: [] });
  }
}

export async function POST(request: Request) {
  try {
    const { action, id } = await request.json();
    if (!action || !id) {
      return NextResponse.json({ error: "Missing action or id" }, { status: 400 });
    }

    const active = await isPm2Active();

    if (!active) {
      return NextResponse.json(
        { error: "PM2 service is offline or not installed on this host." },
        { status: 503 }
      );
    }

    try {
      if (action === "start") {
        await execAsync(`pm2 start ${id}`);
      } else if (action === "stop") {
        await execAsync(`pm2 stop ${id}`);
      } else if (action === "restart") {
        await execAsync(`pm2 restart ${id}`);
      }
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || "Failed to execute PM2 command" }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
