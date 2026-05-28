"use client";

import React, { useState, useEffect } from "react";
import ServerMetrics from "@/components/ServerMetrics";
import { Terminal, Shield, ArrowUpRight, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ContainerItem {
  status: string;
}

interface ProcessItem {
  status: string;
}

interface ProxyRule {
  ssl: boolean;
}

interface CommitInfo {
  sha: string;
  message: string;
}

export default function Dashboard() {
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "sysadmin-daemon initialized on vibe-server-01.dev",
    "Checking Docker service status...",
    "Checking PM2 process manager...",
  ]);
  const [activeContainers, setActiveContainers] = useState<number>(0);
  const [activeProcesses, setActiveProcesses] = useState<number>(0);
  const [sslCount, setSslCount] = useState<number>(0);

  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updateLogs, setUpdateLogs] = useState<string[]>([]);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOverviewStats = async () => {
      const logs: string[] = ["sysadmin-daemon initialized on vibe-server-01.dev"];

      // Docker check
      try {
        const res = await fetch("/api/containers");
        if (res.ok) {
          const data = await res.json();
          const list = data.containers || [];
          const running = list.filter((c: ContainerItem) => c.status === "running").length;
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
          const online = list.filter((p: ProcessItem) => p.status === "online").length;
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
          const secured = data.rules?.filter((r: ProxyRule) => r.ssl).length || 0;
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

  useEffect(() => {
    const checkUpdates = async () => {
      try {
        const res = await fetch("/api/system/update");
        if (res.ok) {
          const data = await res.json();
          if (data.updateAvailable) {
            setUpdateAvailable(true);
            setCommits(data.commits || []);
          } else {
            setUpdateAvailable(false);
          }
        }
      } catch (err) {
        console.error("Failed to check for updates:", err);
      }
    };

    checkUpdates();
    const interval = setInterval(checkUpdates, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const runUpdate = async () => {
    setIsUpdating(true);
    setUpdateError(null);
    setUpdateLogs(["[INFO] Starting update process...", "[INFO] Fetching upstream sources..."]);

    const timer = setInterval(() => {
      setUpdateLogs((prev) => {
        if (prev.length === 2) {
          return [...prev, "[INFO] Running 'git pull' to merge changes..."];
        }
        if (prev.length === 3) {
          return [...prev, "[INFO] Running 'npm install' to synchronize dependencies..."];
        }
        if (prev.length === 4) {
          return [...prev, "[INFO] Compiling production bundle ('next build'). This may take a moment..."];
        }
        return prev;
      });
    }, 3000);

    try {
      const res = await fetch("/api/system/update", { method: "POST" });
      clearInterval(timer);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Update failed during step: " + data.step);
      }

      setUpdateLogs((prev) => [
        ...prev,
        `[SUCCESS] Next.js compilation completed.`,
        `[INFO] ${data.message}`,
        `[INFO] Re-initializing environment...`,
        `[INFO] VibePanel will reload automatically in 5 seconds.`,
      ]);

      setTimeout(() => {
        window.location.reload();
      }, 5000);
    } catch (err) {
      clearInterval(timer);
      const errMsg = err instanceof Error ? err.message : String(err);
      setUpdateLogs((prev) => [...prev, `[FATAL] Update failed: ${errMsg}`]);
      setUpdateError(errMsg);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (isUpdating && !updateError) return;
    setIsModalOpen(open);
  };

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

      {/* Update Available Banner */}
      {updateAvailable && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-200">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded bg-amber-500/10 text-amber-500 shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h4 className="font-mono text-sm font-bold text-amber-200">Software Update Available</h4>
              <p className="font-mono text-xs text-amber-300/80 mt-0.5">
                A new version of VibePanel is ready. {commits.length} pending commit{commits.length > 1 ? "s" : ""} to apply.
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="font-mono text-xs h-8 border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-200"
            >
              View Changes & Update
            </Button>
          </div>
        </div>
      )}

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

      <Dialog open={isModalOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border border-zinc-800 text-zinc-100" showCloseButton={!isUpdating || !!updateError}>
          <DialogHeader>
            <DialogTitle className="font-mono text-base font-bold flex items-center gap-2">
              <RefreshCw size={16} className={isUpdating && !updateError ? "animate-spin" : ""} />
              {isUpdating ? "Updating VibePanel..." : "Software Update"}
            </DialogTitle>
            <DialogDescription className="font-mono text-xs text-zinc-400">
              {isUpdating 
                ? "Please do not close this window or refresh the page while VibePanel updates." 
                : "Apply the latest changes to VibePanel. The application will build and restart."}
            </DialogDescription>
          </DialogHeader>

          {!isUpdating ? (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Pending Commits</span>
                <ScrollArea className="h-44 rounded border border-zinc-800 bg-zinc-900/50 p-2.5 font-mono text-[11px] text-zinc-300">
                  <div className="space-y-2">
                    {commits.map((c, i) => (
                      <div key={i} className="flex items-start gap-2 border-b border-zinc-800/40 pb-1.5 last:border-0 last:pb-0">
                        <span className="text-zinc-500 font-bold select-none">{c.sha.substring(0, 7)}</span>
                        <span className="text-zinc-300 flex-1">{c.message}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Update Progress Console</span>
                <div className="h-44 rounded border border-zinc-800 bg-zinc-950 p-3 font-mono text-[10px] text-zinc-400 overflow-y-auto space-y-1.5 select-text">
                  {updateLogs.map((log, index) => {
                    const isSuccess = log.includes("[SUCCESS]");
                    const isFatal = log.includes("[FATAL]");
                    return (
                      <div key={index} className={isSuccess ? "text-emerald-400" : isFatal ? "text-red-400 font-bold animate-pulse" : "text-zinc-400"}>
                        <span className="text-zinc-600 mr-1.5 select-none">&gt;</span>
                        {log}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex sm:justify-end gap-2">
            {!isUpdating ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)} className="font-mono text-xs">
                  Cancel
                </Button>
                <Button size="sm" onClick={runUpdate} className="font-mono text-xs bg-zinc-100 text-zinc-950 hover:bg-zinc-200">
                  Confirm & Install
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)} disabled={!updateError} className="font-mono text-xs">
                {updateError ? "Dismiss" : "Updating..."}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
