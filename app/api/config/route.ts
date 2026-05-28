import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const CONFIG_FILE = path.join(process.cwd(), "vibepanel-config.json");

export async function GET() {
  try {
    const data = await fs.readFile(CONFIG_FILE, "utf-8");
    const parsed = JSON.parse(data);
    return NextResponse.json(parsed);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return NextResponse.json({
        provider: "anthropic",
        apiKey: "",
        model: "claude-3-5-sonnet",
      });
    }
    return NextResponse.json({ error: "Failed to read configuration from server" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid configuration payload" }, { status: 400 });
    }

    const configToSave = {
      provider: body.provider || "anthropic",
      apiKey: body.apiKey || "",
      model: body.model || "claude-3-5-sonnet",
    };

    await fs.writeFile(CONFIG_FILE, JSON.stringify(configToSave, null, 2), "utf-8");
    return NextResponse.json({ success: true, config: configToSave });
  } catch {
    return NextResponse.json({ error: "Failed to write configuration to server" }, { status: 500 });
  }
}
