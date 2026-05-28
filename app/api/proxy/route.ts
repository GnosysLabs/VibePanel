import { NextResponse } from "next/server";
import { readState, writeState } from "@/lib/state";

export async function GET() {
  try {
    const state = await readState();
    return NextResponse.json({ rules: state.proxyRules });
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
