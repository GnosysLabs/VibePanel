import { NextResponse } from "next/server";
import { readState, writeState } from "@/lib/state";
import fs from "fs/promises";
import path from "path";

async function getNginxConfigPaths(): Promise<string[]> {
  const commonPaths = [
    "/etc/nginx/sites-enabled",
    "/etc/nginx/conf.d",
    "/opt/homebrew/etc/nginx/servers",
    "/usr/local/etc/nginx/servers",
    "/etc/nginx/servers",
  ];
  const activePaths: string[] = [];
  for (const p of commonPaths) {
    try {
      const stats = await fs.stat(p);
      if (stats.isDirectory()) {
        activePaths.push(p);
      }
    } catch {}
  }
  return activePaths;
}

async function parseNginxFile(filePath: string): Promise<any[]> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const rules: any[] = [];
    
    const serverBlocks = content.split(/server\s*\{/g);
    for (let i = 1; i < serverBlocks.length; i++) {
      const block = serverBlocks[i];
      
      const serverNameMatch = block.match(/server_name\s+([^;]+);/);
      const proxyPassMatch = block.match(/proxy_pass\s+([^;]+);/);
      
      if (serverNameMatch && proxyPassMatch) {
        const domains = serverNameMatch[1].trim().split(/\s+/);
        const target = proxyPassMatch[1].trim();
        const isSsl = block.includes("listen 443") || block.includes("ssl_certificate");
        
        for (const domain of domains) {
          rules.push({
            id: `nginx-${path.basename(filePath)}-${domain}`,
            domain,
            target,
            ssl: isSsl,
            sslExpiry: isSsl ? "System Certificate" : "Disabled",
            status: "active",
          });
        }
      }
    }
    return rules;
  } catch (err) {
    console.warn(`Failed to parse Nginx config file at ${filePath}:`, err);
    return [];
  }
}

export async function GET() {
  try {
    const state = await readState();
    
    // Parse system Nginx rules dynamically
    const nginxPaths = await getNginxConfigPaths();
    const systemRules: any[] = [];
    for (const dir of nginxPaths) {
      try {
        const files = await fs.readdir(dir);
        for (const file of files) {
          const rules = await parseNginxFile(path.join(dir, file));
          systemRules.push(...rules);
        }
      } catch {}
    }

    // Merge system rules with saved rules, avoiding duplicates by domain
    const mergedRules = [...state.proxyRules];
    for (const sysRule of systemRules) {
      if (!mergedRules.some((r) => r.domain.toLowerCase() === sysRule.domain.toLowerCase())) {
        mergedRules.push(sysRule);
      }
    }

    return NextResponse.json({ rules: mergedRules });
  } catch {
    return NextResponse.json({ error: "Failed to load proxy rules" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { domain, target, ssl } = body;
    if (!domain || !target) {
      return NextResponse.json({ error: "Missing domain or target" }, { status: 400 });
    }

    const state = await readState();

    // Check if domain already exists
    if (state.proxyRules.some((r) => r.domain.toLowerCase() === domain.toLowerCase())) {
      return NextResponse.json({ error: "Domain routing rule already exists" }, { status: 400 });
    }

    const newRule = {
      id: "r-" + Date.now(),
      domain: domain.trim(),
      target: target.trim(),
      ssl: !!ssl,
      sslExpiry: ssl ? `${new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]} (Auto-Renew)` : "Disabled",
      status: "active" as const,
    };

    state.proxyRules.push(newRule);
    await writeState(state);

    return NextResponse.json({ success: true, rule: newRule });
  } catch {
    return NextResponse.json({ error: "Failed to add proxy rule" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");

    if (!id) {
      // Try body
      try {
        const body = await request.json();
        id = body.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ error: "Missing rule id" }, { status: 400 });
    }

    const state = await readState();
    const exists = state.proxyRules.some((r) => r.id === id);

    if (!exists) {
      return NextResponse.json({ error: "Proxy rule not found" }, { status: 404 });
    }

    state.proxyRules = state.proxyRules.filter((r) => r.id !== id);
    await writeState(state);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete proxy rule" }, { status: 500 });
  }
}
