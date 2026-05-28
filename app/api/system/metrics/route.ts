import { NextResponse } from "next/server";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function GET() {
  try {
    // 1. CPU Usage estimation using load averages
    const loads = os.loadavg();
    // Normalise to cores
    const cores = os.cpus().length || 1;
    const cpuVal = Math.min(Math.round((loads[0] / cores) * 100), 100) || 5;

    // 2. RAM Usage calculations
    const totalMemBytes = os.totalmem();
    const freeMemBytes = os.freemem();
    const ramTotal = totalMemBytes / (1024 * 1024 * 1024); // GB
    const ramVal = (totalMemBytes - freeMemBytes) / (1024 * 1024 * 1024); // GB

    // 3. Disk Space calculations
    let diskTotal = 250;
    let diskVal = 48;
    try {
      const isWin = process.platform === "win32";
      if (!isWin) {
        const { stdout } = await execAsync("df -k /");
        const lines = stdout.trim().split("\n");
        if (lines.length > 1) {
          const parts = lines[1].split(/\s+/);
          // Columns: Filesystem, 1K-blocks, Used, Available, Use%, Mounted on
          const totalKB = parseInt(parts[1], 10);
          const usedKB = parseInt(parts[2], 10);
          if (!isNaN(totalKB) && !isNaN(usedKB)) {
            diskTotal = Math.round(totalKB / (1024 * 1024)); // GB
            diskVal = Math.round(usedKB / (1024 * 1024)); // GB
          }
        }
      }
    } catch {
      // Fallback to static mock values if df command fails or platform is Windows
    }

    // 4. Network I/O
    // Generate simulated dynamic values derived from actual system load
    const netDown = 0.5 + Math.random() * (cpuVal / 10 + 1);
    const netUp = 0.1 + Math.random() * (cpuVal / 20 + 0.5);

    const isDefaultCredentials = !process.env.ADMIN_USER && !process.env.ADMIN_PASSWORD;

    return NextResponse.json({
      cpu: cpuVal,
      ramVal,
      ramTotal,
      diskVal,
      diskTotal,
      netDown,
      netUp,
      isDefaultCredentials,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load system metrics" }, { status: 500 });
  }
}
