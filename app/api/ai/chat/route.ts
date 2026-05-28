import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { readState } from "@/lib/state";

const execAsync = promisify(exec);
const CONFIG_FILE = path.join(process.cwd(), "vibepanel-config.json");

// Helper to get docker info
async function getDockerStatus() {
  try {
    const { stdout } = await execAsync("docker ps -a --format '{{json .}}'");
    return stdout.trim().split("\n").filter(Boolean).map(line => {
      try { return JSON.parse(line); } catch { return line; }
    });
  } catch {
    return "Docker daemon not running or not installed (Using fallback mock system)";
  }
}

// Helper to get PM2 info
async function getPm2Status() {
  try {
    const { stdout } = await execAsync("pm2 jlist");
    return JSON.parse(stdout).map((p: any) => ({
      name: p.name,
      status: p.pm2_env?.status,
      restarts: p.pm2_env?.restart_time,
      cpu: p.monit?.cpu,
      memory: p.monit?.memory,
    }));
  } catch {
    return "PM2 not active or not installed (Using fallback mock system)";
  }
}

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Missing messages array" }, { status: 400 });
    }

    // 1. Read config
    let config = { provider: "anthropic", apiKey: "", model: "claude-3-5-sonnet" };
    try {
      const configData = await fs.readFile(CONFIG_FILE, "utf-8");
      config = JSON.parse(configData);
    } catch {
      // Configuration file not initialized yet
    }

    if (!config.apiKey) {
      return NextResponse.json({
        text: "It looks like you haven't configured your LLM API Key yet. Please go to the **System Settings** page, enter your API key credentials for Anthropic, OpenAI, or OpenRouter, and save the configuration to enable live AI sysadmin remediation.",
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Gather system context for prompt enrichment
    const state = await readState();
    const dockerInfo = await getDockerStatus();
    const pm2Info = await getPm2Status();

    // CPU load averages
    const loads = os.loadavg();
    const cores = os.cpus().length || 1;
    const cpuVal = Math.min(Math.round((loads[0] / cores) * 100), 100) || 5;

    // RAM usage
    const totalMem = os.totalmem() / (1024 * 1024 * 1024);
    const freeMem = os.freemem() / (1024 * 1024 * 1024);
    const ramUsed = totalMem - freeMem;

    // System details
    const sysDetails = {
      platform: process.platform,
      arch: process.arch,
      cores,
      uptime: os.uptime(),
      cpuUsage: `${cpuVal}%`,
      ramUsage: `${ramUsed.toFixed(2)} GB / ${totalMem.toFixed(2)} GB`,
      dockerContainers: Array.isArray(dockerInfo) ? dockerInfo : "fallback simulated containers active",
      pm2Processes: Array.isArray(pm2Info) ? pm2Info : "fallback simulated processes active",
      proxyRules: state.proxyRules,
    };

    // 3. Construct system prompt
    const systemPrompt = `You are VibePanel AI Sysadmin, a smart developer assistant that helps manage servers.
You have real-time read access to the system metrics, PM2 process maps, Docker configurations, and Reverse Proxy rules.

Here is the current live system context:
${JSON.stringify(sysDetails, null, 2)}

Instructions:
1. Keep your response concise, technical, and helpful.
2. If the user wants to start, stop, or restart a container or a PM2 process, or expose a proxy port:
   - Identify the target item ID (e.g. container id like "c-001" or process name/id like "p-001" or "api-server").
   - Offer an interactive "action" object in your JSON response so they can execute it with 1-click.
3. If proposing configuration files or Docker Compose adjustments, supply a git-style Unified Diff in the "codeDiff" field.
4. You MUST respond with a valid JSON object matching the following structure:
{
  "text": "Markdown formatted description of diagnostic findings, recommendations, or answer",
  "codeDiff": {
    "filename": "relative/path/to/file.yml",
    "diff": "+ added line\\n- removed line\\n  unchanged line"
  }, // optional
  "action": {
    "type": "container" | "process",
    "action": "start" | "stop" | "restart",
    "targetId": "c-001" | "api-server",
    "label": "Restart Postgres DB"
  } // optional
}
Do NOT include any markdown code blocks (e.g. \`\`\`json) outside the JSON structure. Respond ONLY with the raw JSON string.`;

    // 4. Invoke LLM provider
    let textResult = "";
    const history = messages.slice(-8); // Limit history length to conserve tokens

    if (config.provider === "anthropic") {
      const anthropicModel = config.model || "claude-3-5-sonnet";
      const payload = {
        model: anthropicModel,
        max_tokens: 2048,
        system: systemPrompt,
        messages: history.map(m => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.text,
        })),
      };

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": config.apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      textResult = data.content?.[0]?.text || "";
    } else if (config.provider === "openai") {
      const openAiModel = config.model || "gpt-4o";
      const payload = {
        model: openAiModel,
        messages: [
          { role: "system", content: systemPrompt },
          ...history.map(m => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.text,
          })),
        ],
        response_format: { type: "json_object" },
      };

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      textResult = data.choices?.[0]?.message?.content || "";
    } else if (config.provider === "openrouter") {
      const orModel = config.model || "google/gemini-2.5-pro";
      const payload = {
        model: orModel,
        messages: [
          { role: "system", content: systemPrompt },
          ...history.map(m => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.text,
          })),
        ],
        response_format: { type: "json_object" },
      };

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      textResult = data.choices?.[0]?.message?.content || "";
    } else {
      return NextResponse.json({ error: "Unsupported provider configuration" }, { status: 400 });
    }

    // 5. Parse response JSON block
    let parsedResponse;
    try {
      // Strip out markdown ```json tags if the model ignored instructions and returned them anyway
      let cleanText = textResult.trim();
      if (cleanText.startsWith("```json")) {
        cleanText = cleanText.substring(7);
      }
      if (cleanText.endsWith("```")) {
        cleanText = cleanText.substring(0, cleanText.length - 3);
      }
      parsedResponse = JSON.parse(cleanText.trim());
    } catch {
      // Fallback: if not valid JSON, treat the whole thing as text
      parsedResponse = {
        text: textResult,
      };
    }

    return NextResponse.json({
      ...parsedResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("AI Assistant API Error:", error);
    return NextResponse.json({
      text: `An error occurred while communicating with the AI model provider API: ${error.message || error}. Please verify your API Key and network connection in System Settings.`,
      timestamp: new Date().toISOString(),
    });
  }
}
