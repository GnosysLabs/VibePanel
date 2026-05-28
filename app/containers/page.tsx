"use client";

import React, { useState, useEffect } from "react";
import {
  Container,
  Play,
  Square,
  RotateCw,
  Clock,
  Layers,
  Search,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: "running" | "stopped" | "paused";
  ports: string;
  created: string;
  memory: string;
  cpu: string;
  env: string[];
}

export default function ContainersPage() {
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDockerOnline, setIsDockerOnline] = useState<boolean>(true);
  const [search, setSearch] = useState("");
  const [activeInspect, setActiveInspect] = useState<DockerContainer | null>(null);
  const [ephemeralTime, setEphemeralTime] = useState<number | null>(null); // countdown seconds

  const fetchContainers = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const response = await fetch("/api/containers");
      if (response.ok) {
        const data = await response.json();
        const list = data.containers || [];
        setContainers(list);
        setIsDockerOnline(!!data.active);
        if (activeInspect) {
          const updated = list.find((c: DockerContainer) => c.id === activeInspect.id);
          if (updated) {
            setActiveInspect(updated);
          }
        }
        const hasEphemeral = list.some((c: DockerContainer) => c.id === "ephemeral-test" || c.name === "node-testbed");
        if (hasEphemeral && ephemeralTime === null) {
          setEphemeralTime(2 * 60 * 60);
        } else if (!hasEphemeral && ephemeralTime !== null) {
          setEphemeralTime(null);
        }
      }
    } catch (error) {
      console.error("Failed to fetch containers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContainers(true);
    const interval = setInterval(() => fetchContainers(false), 4000);
    return () => clearInterval(interval);
  }, [activeInspect, ephemeralTime]);

  const destroyEphemeralContainer = async () => {
    try {
      const response = await fetch("/api/containers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "destroy-ephemeral", id: "ephemeral-test" }),
      });
      if (response.ok) {
        setEphemeralTime(null);
        toast.info("Sandbox container destroyed.");
        fetchContainers();
      }
    } catch (error) {
      console.error("Failed to destroy ephemeral container:", error);
    }
  };

  // Ephemeral testbed timer loop
  useEffect(() => {
    if (ephemeralTime === null) return;
    if (ephemeralTime <= 0) {
      destroyEphemeralContainer();
      return;
    }
    const interval = setInterval(() => {
      setEphemeralTime((t) => (t !== null ? t - 1 : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [ephemeralTime]);

  const toggleContainer = async (id: string) => {
    const target = containers.find((c) => c.id === id);
    if (!target) return;
    const isRunning = target.status === "running";
    const action = isRunning ? "stop" : "start";

    const toastId = toast.loading(`${isRunning ? "Stopping" : "Starting"} container ${target.name}...`);
    try {
      const response = await fetch("/api/containers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id }),
      });
      if (response.ok) {
        toast.dismiss(toastId);
        if (action === "start") {
          toast.success(`Container '${target.name}' started successfully.`);
        } else {
          toast.info(`Container '${target.name}' stopped.`);
        }
        fetchContainers();
      } else {
        toast.dismiss(toastId);
        toast.error(`Failed to ${action} container.`);
      }
    } catch {
      toast.dismiss(toastId);
      toast.error(`Failed to ${action} container.`);
    }
  };

  const restartContainer = async (id: string) => {
    const target = containers.find((c) => c.id === id);
    if (!target) return;

    const toastId = toast.loading(`Restarting container ${target.name}...`);
    try {
      const response = await fetch("/api/containers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restart", id }),
      });
      if (response.ok) {
        toast.dismiss(toastId);
        toast.success(`Container '${target.name}' restarted.`);
        fetchContainers();
      } else {
        toast.dismiss(toastId);
        toast.error("Failed to restart container.");
      }
    } catch {
      toast.dismiss(toastId);
      toast.error("Failed to restart container.");
    }
  };

  const startEphemeralContainer = async () => {
    const toastId = toast.loading("Spawning Ephemeral Sandbox...");
    try {
      const response = await fetch("/api/containers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "spawn-ephemeral", id: "ephemeral-test" }),
      });
      if (response.ok) {
        toast.dismiss(toastId);
        setEphemeralTime(2 * 60 * 60);
        toast.success("Ephemeral Sandbox Spawned", {
          description: "A daemon-level Cron has scheduled this container to self-destruct in exactly 2 hours.",
          duration: 5000,
        });
        fetchContainers();
      } else {
        toast.dismiss(toastId);
        toast.error("Failed to spawn sandbox.");
      }
    } catch {
      toast.dismiss(toastId);
      toast.error("Failed to spawn sandbox.");
    }
  };

  const getTimerString = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const filtered = containers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.image.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 select-none pb-12 font-mono text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Container className="text-primary" />
            DOCKER CONTAINERS
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage local stacks, volume bindings, and configure zero-config SSL proxies
          </p>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={startEphemeralContainer}
            disabled={!isDockerOnline}
            className="flex items-center gap-1.5 h-9 bg-primary/10 border-primary/20 hover:bg-primary/20 text-primary hover:text-foreground cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Clock size={13} />
            <span>Spin up Ephemeral Testbed (2h)</span>
          </Button>
        </div>
      </div>

      {!isDockerOnline && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 flex gap-3 text-[10px] text-amber-500 leading-relaxed font-mono">
          <Clock size={14} className="shrink-0 mt-0.5 text-amber-500" />
          <div>
            <span className="font-bold uppercase block mb-0.5">Docker Daemon Offline</span>
            Could not reach the Docker socket at unix:///var/run/docker.sock. Verify that Docker is running on your host machine to list active containers or launch sandboxes.
          </div>
        </div>
      )}

      {/* Main Containers grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List layout */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search bar */}
          <div className="flex items-center rounded-lg border border-border bg-neutral-900/40 px-3 py-1">
            <Search size={14} className="text-muted-foreground mr-2 shrink-0" />
            <Input
              type="text"
              placeholder="Search running containers or images..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent border-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-xs text-foreground h-9"
            />
          </div>

          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader className="bg-black/20 text-[10px] uppercase">
                <TableRow>
                  <TableHead className="p-3">Container Info</TableHead>
                  <TableHead className="p-3">Status</TableHead>
                  <TableHead className="p-3">Port Mappings</TableHead>
                  <TableHead className="p-3 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="p-8 text-center text-muted-foreground select-none">
                      {isLoading ? "Querying containers..." : "No containers found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => {
                    const isRunning = c.status === "running";
                    return (
                      <TableRow
                        key={c.id}
                        onClick={() => setActiveInspect(c)}
                        className={`hover:bg-neutral-900/30 cursor-pointer transition-colors ${
                          activeInspect?.id === c.id ? "bg-neutral-900/50" : ""
                        }`}
                      >
                        <TableCell className="p-3">
                          <div className="font-semibold text-foreground">{c.name}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">{c.image}</div>
                        </TableCell>
                        <TableCell className="p-3">
                          <Badge
                            variant="outline"
                            className={`gap-1.5 font-mono text-[9px] uppercase ${
                              isRunning
                                ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/60"
                                : "bg-red-950/20 text-red-400 border-red-900/60"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isRunning
                                  ? "bg-emerald-500 animate-glow-green"
                                  : "bg-red-500 animate-glow-red"
                              }`}
                            ></span>
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="p-3 text-[10px] text-muted-foreground truncate max-w-[150px]">
                          {c.ports}
                        </TableCell>
                        <TableCell className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => toggleContainer(c.id)}
                              className="h-7 w-7 hover:bg-neutral-950 border border-border text-muted-foreground hover:text-foreground cursor-pointer"
                              title={isRunning ? "Stop container" : "Start container"}
                            >
                              {isRunning ? <Square size={10} /> : <Play size={10} />}
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => restartContainer(c.id)}
                              className="h-7 w-7 hover:bg-neutral-950 border border-border text-muted-foreground hover:text-foreground cursor-pointer"
                              title="Restart container"
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

        {/* Inspect container side panel sheet */}
        <div className="rounded-lg border border-border bg-card p-4 flex flex-col justify-between h-[360px]">
          {activeInspect ? (
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-3">
                  <div className="flex items-center gap-1.5 text-foreground font-semibold">
                    <Layers size={13} className="text-primary" />
                    <span>Metadata: {activeInspect.name}</span>
                  </div>
                  <Badge variant="outline" className="text-[8px] bg-neutral-900 text-neutral-400 border-neutral-850 px-1.5 py-0">
                    {activeInspect.id}
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] py-1 border-b border-neutral-900/60">
                    <span className="text-muted-foreground">Image:</span>
                    <span className="text-foreground max-w-[160px] truncate">{activeInspect.image}</span>
                  </div>
                  <div className="flex justify-between text-[10px] py-1 border-b border-neutral-900/60">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="text-foreground">{activeInspect.created}</span>
                  </div>
                  <div className="flex justify-between text-[10px] py-1 border-b border-neutral-900/60">
                    <span className="text-muted-foreground">CPU Load:</span>
                    <span className="text-foreground">{activeInspect.cpu}</span>
                  </div>
                  <div className="flex justify-between text-[10px] py-1 border-b border-neutral-900/60">
                    <span className="text-muted-foreground">RAM Alloc:</span>
                    <span className="text-foreground font-bold">{activeInspect.memory}</span>
                  </div>
                </div>

                {/* Env Vars */}
                <div className="mt-4">
                  <span className="text-[9px] text-muted-foreground uppercase tracking-widest block mb-1">
                    Environment Variables
                  </span>
                  <ScrollArea className="h-[75px] rounded bg-black/40 border border-neutral-900/60 p-2 text-[9px] text-neutral-400">
                    <div className="space-y-1">
                      {activeInspect.env.map((env, index) => (
                        <div key={index} className="truncate">
                          {env}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              {/* Zero config proxy */}
              <div className="mt-3 pt-3 border-t border-border/40 flex justify-between items-center text-[10px]">
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Zero-Config Port Bind</span>
                  <span className="text-primary font-semibold">{activeInspect.name}.my-app.dev</span>
                </div>
                <Switch
                  checked={activeInspect.id === "c-001"}
                  onCheckedChange={() => {
                    toast.info(`Zero-Config routing toggled for ${activeInspect.name}`);
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
              <Container size={28} className="mb-2 text-neutral-800" />
              <span>Select a Docker Container to inspect volume bindings, logs, and routing.</span>
            </div>
          )}
        </div>
      </div>

      {/* Ephemeral Timer indicator at bottom if active */}
      {ephemeralTime !== null && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
            <div>
              <div className="font-semibold text-primary/90">Ephemeral Testbed active: node-testbed</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Isolated node sandbox environment online.</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-base font-bold text-primary tracking-wider">
              {getTimerString(ephemeralTime)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={destroyEphemeralContainer}
              className="rounded bg-primary/10 hover:bg-primary/20 border-primary/20 px-3 py-1 text-[10px] text-primary hover:text-foreground cursor-pointer transition-colors"
            >
              Destruct Now
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
