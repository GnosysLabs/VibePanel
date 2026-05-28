import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function isPm2Active(): Promise<boolean> {
  try {
    await execAsync("pm2 --version");
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    // 1. Fetch remote references
    try {
      await execAsync("git fetch");
    } catch (err: any) {
      console.warn("Git fetch failed: ", err.message);
      return NextResponse.json({
        updateAvailable: false,
        error: "Failed to fetch remote updates from GitHub.",
      });
    }

    // 2. Compare local HEAD and upstream
    const { stdout: localSha } = await execAsync("git rev-parse HEAD");
    const { stdout: upstreamSha } = await execAsync("git rev-parse @{u}");

    const local = localSha.trim();
    const upstream = upstreamSha.trim();

    if (local !== upstream) {
      // 3. Get pending commits log
      const { stdout: commitsLog } = await execAsync("git log HEAD..@{u} --oneline");
      const commits = commitsLog
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const index = line.indexOf(" ");
          const sha = line.substring(0, index);
          const message = line.substring(index + 1);
          return { sha, message };
        });

      return NextResponse.json({
        updateAvailable: true,
        currentSha: local,
        latestSha: upstream,
        commits,
      });
    }

    return NextResponse.json({
      updateAvailable: false,
      currentSha: local,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to check for updates" }, { status: 500 });
  }
}

export async function POST() {
  try {
    // 1. Pull latest code
    try {
      await execAsync("git pull");
    } catch (err: any) {
      return NextResponse.json({ error: "Git pull failed: " + err.message, step: "pull" }, { status: 500 });
    }

    // 2. Install dependencies
    try {
      await execAsync("npm install");
    } catch (err: any) {
      return NextResponse.json({ error: "Dependency installation failed: " + err.message, step: "install" }, { status: 500 });
    }

    // 3. Rebuild Next.js project
    try {
      await execAsync("npm run build");
    } catch (err: any) {
      return NextResponse.json({ error: "Next.js build failed: " + err.message, step: "build" }, { status: 500 });
    }

    // 4. Handle self-restart via PM2
    const pm2Active = await isPm2Active();
    let pm2Restarted = false;

    if (pm2Active) {
      try {
        const { stdout: jlistOutput } = await execAsync("pm2 jlist");
        const list = JSON.parse(jlistOutput);
        const cwd = process.cwd();

        // Search for a process running VibePanel inside the project CWD
        const match = list.find(
          (p: any) =>
            p.pm2_env?.pm_exec_path &&
            p.pm2_env.pm_exec_path.startsWith(cwd)
        );

        if (match) {
          const targetId = match.pm_id !== undefined ? match.pm_id : match.name;
          // Trigger reload/restart in the background (delayed by 1s)
          exec(`sleep 1 && pm2 restart ${targetId}`);
          pm2Restarted = true;
        }
      } catch (err) {
        console.error("Failed to trigger PM2 self-restart:", err);
      }
    }

    return NextResponse.json({
      success: true,
      pm2Restarted,
      message: pm2Restarted
        ? "VibePanel compiled successfully. PM2 daemon is restarting the process..."
        : "VibePanel compiled successfully. Please manually restart the server to apply changes.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to execute update" }, { status: 500 });
  }
}
