"use client";

import React, { useState, useEffect } from "react";
import {
  Cpu,
  Play,
  RotateCw,
  Square,
  Search,
  Terminal,
  Info,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface PM2Process {
  id: string;
  name: string;
  lang: string;
  status: "online" | "stopped" | "errored";
  instances: number;
  memory: string;
  cpu: string;
  restarts: number;
  uptime: string;
  path: string;
  logs: string[];
}

export default function ProcessesPage() {
  const [processes, setProcesses] = useState<PM2Process[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPm2Online, setIsPm2Online] = useState<boolean>(true);
  const [search, setSearch] = useState("");
  const [selectedProcess, setSelectedProcess] = useState<PM2Process | null>(null);

  const fetchProcesses = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const response = await fetch("/api/processes");
      if (response.ok) {
        const data = await response.json();
        const list = data.processes || [];
        setProcesses(list);
        setIsPm2Online(!!data.active);
        if (selectedProcess) {
          const updated = list.find((p: PM2Process) => p.id === selectedProcess.id);
          if (updated) setSelectedProcess(updated);
        }
      }
    } catch (error) {
      console.error("Failed to fetch PM2 processes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses(true);
    const interval = setInterval(() => fetchProcesses(false), 4000);
    return () => clearInterval(interval);
  }, [selectedProcess]);

  const toggleProcess = async (id: string) => {
    const target = processes.find((p) => p.id === id);
    if (!target) return;
    const isOnline = target.status === "online";
    const action = isOnline ? "stop" : "start";

    const toastId = toast.loading(`${isOnline ? "Stopping" : "Starting"} process ${target.name}...`);
    try {
      const response = await fetch("/api/processes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id }),
      });
      if (response.ok) {
        toast.dismiss(toastId);
        if (action === "start") {
          toast.success(`Process '${target.name}' started successfully.`);
        } else {
          toast.info(`Process '${target.name}' stopped.`);
        }
        fetchProcesses();
      } else {
        toast.dismiss(toastId);
        toast.error(`Failed to ${action} process.`);
      }
    } catch {
      toast.dismiss(toastId);
      toast.error(`Failed to ${action} process.`);
    }
  };

  const restartProcess = async (id: string) => {
    const target = processes.find((p) => p.id === id);
    if (!target) return;

    const toastId = toast.loading(`Reloading process ${target.name}...`);
    try {
      const response = await fetch("/api/processes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restart", id }),
      });
      if (response.ok) {
        toast.dismiss(toastId);
        toast.success(`Process '${target.name}' reloaded successfully.`);
        fetchProcesses();
      } else {
        toast.dismiss(toastId);
        toast.error("Failed to reload process.");
      }
    } catch {
      toast.dismiss(toastId);
      toast.error("Failed to reload process.");
    }
  };

  const filtered = processes.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.lang.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 select-none pb-12 font-mono text-xs">
      {/* Header */}
      <div className="border-b border-border/60 pb-5">
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Cpu className="text-primary" />
          PM2 PROCESS MANAGER
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Monitor native scripts, scale instances cluster mode, and reload processes without downtime
        </p>
      </div>

      {!isPm2Online && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 flex gap-3 text-[10px] text-amber-500 leading-relaxed font-mono">
          <Cpu size={14} className="shrink-0 mt-0.5 text-amber-500" />
          <div>
            <span className="font-bold uppercase block mb-0.5">PM2 Executable Not Found</span>
            Could not locate the `pm2` command globally. Verify that PM2 is installed globally (`npm install -g pm2`) and running on this server to track native node processes or manage script reload trees.
          </div>
        </div>
      )}

      {/* Grid view */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Process list table */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search bar */}
          <div className="flex items-center rounded-lg border border-border bg-neutral-900/40 px-3 py-1">
            <Search size={14} className="text-muted-foreground mr-2 shrink-0" />
            <Input
              type="text"
              placeholder="Search active scripts or runtime engines..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent border-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-xs text-foreground h-9"
            />
          </div>

          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader className="bg-black/20 text-[10px] uppercase">
                <TableRow>
                  <TableHead className="p-3">Script Name</TableHead>
                  <TableHead className="p-3">Mode / Inst</TableHead>
                  <TableHead className="p-3">RAM</TableHead>
                  <TableHead className="p-3">CPU</TableHead>
                  <TableHead className="p-3 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="p-8 text-center text-muted-foreground select-none">
                      {isLoading ? "Querying process list..." : "No active processes found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => {
                    const isOnline = p.status === "online";
                    return (
                      <TableRow
                        key={p.id}
                        onClick={() => setSelectedProcess(p)}
                        className={`hover:bg-neutral-900/30 cursor-pointer transition-colors ${
                          selectedProcess?.id === p.id ? "bg-neutral-900/50" : ""
                        }`}
                      >
                        <TableCell className="p-3">
                          <div className="font-semibold text-foreground">{p.name}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">{p.lang}</div>
                        </TableCell>
                        <TableCell className="p-3">
                          <span className="text-[10px] text-neutral-300">
                            {p.instances > 1 ? `cluster (${p.instances})` : "fork"}
                          </span>
                        </TableCell>
                        <TableCell className="p-3 font-semibold text-primary">{p.memory}</TableCell>
                        <TableCell className="p-3">{p.cpu}</TableCell>
                        <TableCell className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => toggleProcess(p.id)}
                              className="h-7 w-7 hover:bg-neutral-950 border border-border text-muted-foreground hover:text-foreground cursor-pointer"
                              title={isOnline ? "Stop process" : "Start process"}
                            >
                              {isOnline ? <Square size={10} /> : <Play size={10} />}
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => restartProcess(p.id)}
                              className="h-7 w-7 hover:bg-neutral-950 border border-border text-muted-foreground hover:text-foreground cursor-pointer"
                              title="Reload process"
                            >
                              <RotateCw size={10} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Process Detail Inspect & Logs */}
        <div className="rounded-lg border border-border bg-card p-4 flex flex-col justify-between h-[360px]">
          {selectedProcess ? (
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-3">
                  <div className="flex items-center gap-1.5 text-foreground font-semibold">
                    <Info size={13} className="text-primary" />
                    <span>Process: {selectedProcess.name}</span>
                  </div>
                  <Badge variant="outline" className={`font-mono text-[9px] uppercase ${
                    selectedProcess.status === "online"
                      ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/60"
                      : "bg-red-950/20 text-red-400 border-red-900/60"
                  }`}>
                    {selectedProcess.status}
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] py-1 border-b border-neutral-900/60">
                    <span className="text-muted-foreground">Path:</span>
                    <span className="text-foreground max-w-[170px] truncate" title={selectedProcess.path}>
                      {selectedProcess.path}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] py-1 border-b border-neutral-900/60">
                    <span className="text-muted-foreground">Uptime:</span>
                    <span className="text-foreground">{selectedProcess.uptime}</span>
                  </div>
                  <div className="flex justify-between text-[10px] py-1 border-b border-neutral-900/60">
                    <span className="text-muted-foreground">Restarts:</span>
                    <span className="text-foreground">{selectedProcess.restarts}</span>
                  </div>
                </div>

                {/* Logs Stream */}
                <div className="mt-4 flex flex-col">
                  <span className="text-[9px] text-primary font-semibold uppercase tracking-widest block mb-1 flex items-center gap-1">
                    <Terminal size={10} /> Live Logs
                  </span>
                  <ScrollArea className="h-[120px] rounded bg-black/40 border border-neutral-900/60 p-2.5 font-mono text-[9px] text-neutral-400 select-text">
                    <div className="space-y-1">
                      {selectedProcess.logs.map((log, index) => (
                        <div key={index} className="leading-tight py-0.5">
                          {log}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-border/40 text-[9px] text-muted-foreground text-center">
                Autostart script: configured in `/etc/systemd/system/pm2-root`
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
              <Cpu size={28} className="mb-2 text-neutral-800" />
              <span>Select a PM2 process to inspect configurations, view performance metrics, and view real-time log outputs.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
