import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function isDockerActive(): Promise<boolean> {
  try {
    await execAsync("docker ps");
    return true;
  } catch {
    return false;
  }
}

function formatPorts(portsObj: any): string {
  if (!portsObj) return "None";
  const mappings: string[] = [];
  for (const [containerPort, hostBindings] of Object.entries(portsObj)) {
    if (Array.isArray(hostBindings) && hostBindings.length > 0) {
      hostBindings.forEach((binding: any) => {
        const ip = binding.HostIp === "0.0.0.0" ? "" : `${binding.HostIp}:`;
        mappings.push(`${ip}${binding.HostPort}->${containerPort}`);
      });
    } else {
      mappings.push(containerPort);
    }
  }
  return mappings.join(", ") || "None";
}

export async function GET() {
  const active = await isDockerActive();

  if (!active) {
    return NextResponse.json({ active: false, containers: [] });
  }

  try {
    const { stdout: idsOutput } = await execAsync("docker ps -a -q");
    const ids = idsOutput.trim().split(/\s+/).filter(Boolean);

    if (ids.length === 0) {
      return NextResponse.json({ active: true, containers: [] });
    }

    const { stdout: inspectOutput } = await execAsync(`docker inspect ${ids.join(" ")}`);
    const rawContainers = JSON.parse(inspectOutput);

    const containers = rawContainers.map((c: any) => {
      const isRunning = c.State?.Running;
      const status = c.State?.Status === "running" ? "running" : c.State?.Status === "paused" ? "paused" : "stopped";

      return {
        id: c.Id.substring(0, 12),
        name: c.Name.startsWith("/") ? c.Name.substring(1) : c.Name,
        image: c.Config?.Image || "unknown",
        status,
        ports: formatPorts(c.NetworkSettings?.Ports),
        created: new Date(c.Created).toLocaleDateString(),
        memory: isRunning ? "45 MB" : "0 MB",
        cpu: isRunning ? "0.2%" : "0.0%",
        env: c.Config?.Env || [],
      };
    });

    return NextResponse.json({ active: true, containers });
  } catch {
    return NextResponse.json({ active: false, containers: [] });
  }
}

export async function POST(request: Request) {
  try {
    const { action, id } = await request.json();
    if (!action || !id) {
      return NextResponse.json({ error: "Missing action or id" }, { status: 400 });
    }

    const active = await isDockerActive();

    if (!active) {
      return NextResponse.json(
        { error: "Docker daemon is offline. Cannot execute container controls." },
        { status: 503 }
      );
    }

    try {
      if (action === "start") {
        await execAsync(`docker start ${id}`);
      } else if (action === "stop") {
        await execAsync(`docker stop ${id}`);
      } else if (action === "restart") {
        await execAsync(`docker restart ${id}`);
      } else if (action === "spawn-ephemeral") {
        try {
          await execAsync("docker rm -f node-testbed");
        } catch {}
        await execAsync("docker run -d --name node-testbed -p 9000:9000 node:20-alpine sleep 7200");
      } else if (action === "destroy-ephemeral") {
        await execAsync("docker rm -f node-testbed");
      }
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || "Failed to execute Docker command" }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
