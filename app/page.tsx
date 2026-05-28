"use client";

import React, { useState, useEffect } from "react";
import ServerMetrics from "@/components/ServerMetrics";
import { Terminal, Shield, ArrowUpRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

export default function Dashboard() {
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "sysadmin-daemon initialized on vibe-server-01.dev",
    "Checking Docker service status...",
    "Checking PM2 process manager...",
  ]);
  const [activeContainers, setActiveContainers] = useState<number>(0);
  const [activeProcesses, setActiveProcesses] = useState<number>(0);
  const [sslCount, setSslCount] = useState<number>(0);

  useEffect(() => {
    const fetchOverviewStats = async () => {
      const logs: string[] = ["sysadmin-daemon initialized on vibe-server-01.dev"];

      // Docker check
      try {
        const res = await fetch("/api/containers");
        if (res.ok) {
          const data = await res.json();
          const list = data.containers || [];
          const running = list.filter((c: any) => c.status === "running").length;
          setActiveContainers(running);
          if (data.active) {
            logs.push("Docker daemon connection: ONLINE");
          } else {
            logs.push("Docker daemon status: OFFLINE (Check if Docker Desktop is running)");
          }
        }
      } catch {
        logs.push("Docker daemon connection failed");
      }

      // PM2 check
      try {
        const res = await fetch("/api/processes");
        if (res.ok) {
          const data = await res.json();
          const list = data.processes || [];
          const online = list.filter((p: any) => p.status === "online").length;
          setActiveProcesses(online);
          if (data.active) {
            logs.push("PM2 process manager connected: ONLINE");
          } else {
            logs.push("PM2 process manager: NOT FOUND (Verify global installation)");
          }
        }
      } catch {
        logs.push("PM2 service check failed");
      }

      // Proxy check
      try {
        const res = await fetch("/api/proxy");
        if (res.ok) {
          const data = await res.json();
          const secured = data.rules?.filter((r: any) => r.ssl).length || 0;
          setSslCount(secured);
          logs.push("Caddy/Nginx virtual hosts proxy config: SYNCHRONIZED");
        }
      } catch {
        logs.push("Proxy routing sync failed");
      }

      // Security credentials check
      try {
        const res = await fetch("/api/system/metrics");
        if (res.ok) {
          const data = await res.json();
          if (data.isDefaultCredentials) {
            logs.push("[CRITICAL] [SECURITY WARNING] Default admin credentials are in use!");
            logs.push("[WARNING] Define ADMIN_USER & ADMIN_PASSWORD in your environment variables to secure access.");
          }
        }
      } catch {}

      setTerminalLogs(logs);
    };

    fetchOverviewStats();
  }, []);

  const clearLogs = () => {
    setTerminalLogs([`Terminal history cleared. Daemon monitoring active.`]);
    toast.info("Terminal Logs Cleared");
  };

  return (
    <div className="space-y-6 select-none pb-12">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-mono font-bold tracking-tight text-foreground">
              vibe-server-01.dev
            </h1>
            <Badge variant="outline" className="bg-emerald-950/30 text-emerald-400 border-emerald-900/60 font-mono text-[9px] gap-1 uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-glow-green inline-block"></span>
              Online
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">
            IP: 142.250.190.46 · Location: Oregon, US (NVMe Dedicated)
          </p>
        </div>
      </div>

      {/* 1. Real-time metrics grid */}
      <ServerMetrics />

      {/* 3. Bottom Summary Info & Terminal Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Terminal Log Panel */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-4 flex flex-col justify-between h-[280px]">
          <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-3">
            <span className="text-xs font-mono font-semibold text-muted-foreground flex items-center gap-1.5">
              <Terminal size={14} className="text-primary" />
              DAEMON SYSTEM STREAM
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearLogs}
                className="h-5 px-1.5 text-[9px] font-mono text-muted-foreground hover:text-foreground cursor-pointer border border-border/40 rounded bg-transparent"
              >
                Clear
              </Button>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-glow-green"></span>
            </div>
          </div>

          <ScrollArea className="flex-1 h-[190px] rounded bg-black/40 border border-neutral-950 p-3 font-mono text-[10px] text-neutral-400 select-text">
            <div className="space-y-1.5">
              {terminalLogs.map((log, index) => {
                const isCrit = log.includes("[CRITICAL]");
                const isWarn = log.includes("[WARNING]");
                return (
                  <div
                    key={index}
                    className={`leading-relaxed border-l-2 pl-2 ${
                      isCrit
                        ? "border-red-500 text-red-400/90"
                        : isWarn
                        ? "border-amber-500 text-amber-400/90"
                        : "border-neutral-800 text-neutral-400"
                    }`}
                  >
                    <span className="text-neutral-600 mr-1.5 select-none">{">"}</span>
                    {log}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Stack Quick Action Overview */}
        <div className="rounded-lg border border-border bg-card p-4 flex flex-col h-[280px]">
          <span className="text-xs font-mono font-semibold text-muted-foreground flex items-center gap-1.5 border-b border-border/60 pb-2 mb-3">
            <Shield size={14} className="text-muted-foreground" />
            STATION OVERVIEW
          </span>

          <div className="flex-1 space-y-4 font-mono text-[11px]">
            <div className="flex justify-between items-center py-1 border-b border-neutral-950">
              <span className="text-muted-foreground">Active Containers:</span>
              <span className="text-foreground font-semibold">{activeContainers} Running</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-neutral-950">
              <span className="text-muted-foreground">PM2 Native Scripts:</span>
              <span className="text-foreground font-semibold">{activeProcesses} Online</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-neutral-950">
              <span className="text-muted-foreground">Certificates (SSL):</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                {sslCount} Active <ArrowUpRight size={10} />
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-neutral-950">
              <span className="text-muted-foreground">Zero-Config Port:</span>
              <span className="text-foreground">Caddy Embedded</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
