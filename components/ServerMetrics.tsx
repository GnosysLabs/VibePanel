"use client";

import React, { useState, useEffect } from "react";
import { Cpu, HardDrive, Network, Layers } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function ServerMetrics() {
  // Store histories for live sparklines
  const [cpuHistory, setCpuHistory] = useState<number[]>(Array(20).fill(15));
  const [ramHistory, setRamHistory] = useState<number[]>(Array(20).fill(42));
  const [netDownHistory, setNetDownHistory] = useState<number[]>(Array(20).fill(5));
  const [netUpHistory, setNetUpHistory] = useState<number[]>(Array(20).fill(2));

  // Current values
  const [cpuVal, setCpuVal] = useState(15);
  const [ramVal, setRamVal] = useState(6.7); // in GB
  const [ramTotal, setRamTotal] = useState(16.0);
  const [diskVal, setDiskVal] = useState(148); // in GB
  const [diskTotal, setDiskTotal] = useState(512);
  const [netDown, setNetDown] = useState(4.8); // in MB/s
  const [netUp, setNetUp] = useState(1.4); // in MB/s

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch("/api/system/metrics");
        if (response.ok) {
          const data = await response.json();
          setCpuVal(data.cpu);
          setCpuHistory((prev) => [...prev.slice(1), data.cpu]);

          setRamVal(data.ramVal);
          setRamTotal(data.ramTotal);
          const ramPercent = Math.round((data.ramVal / data.ramTotal) * 100);
          setRamHistory((prev) => [...prev.slice(1), ramPercent]);

          setDiskVal(data.diskVal);
          setDiskTotal(data.diskTotal);

          setNetDown(data.netDown);
          setNetUp(data.netUp);
          setNetDownHistory((prev) => [...prev.slice(1), Math.round(data.netDown * 5)]);
          setNetUpHistory((prev) => [...prev.slice(1), Math.round(data.netUp * 15)]);
        }
      } catch (error) {
        console.error("Failed to load metrics:", error);
      }
    };

    fetchMetrics();
    const timer = setInterval(fetchMetrics, 2000);
    return () => clearInterval(timer);
  }, []);

  // SVG sparkline path generator
  const getSparklinePath = (data: number[], width: number, height: number) => {
    if (data.length === 0) return "";
    const xStep = width / (data.length - 1);
    const maxVal = 100;
    const points = data.map((val, idx) => {
      const x = idx * xStep;
      // Invert Y because SVG coordinates start from top-left
      const y = height - (val / maxVal) * (height - 4) - 2;
      return `${x},${y}`;
    });
    return `M ${points.join(" L ")}`;
  };

  // SVG Area path generator (closes the shape at the bottom for gradient fill)
  const getAreaPath = (data: number[], width: number, height: number) => {
    const linePath = getSparklinePath(data, width, height);
    if (!linePath) return "";
    return `${linePath} L ${width},${height} L 0,${height} Z`;
  };

  const cpuPercent = cpuVal;
  const ramPercent = Math.round((ramVal / ramTotal) * 100);
  const diskPercent = Math.round((diskVal / diskTotal) * 100);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {/* CPU Card */}
      <Tooltip>
        <TooltipTrigger
          render={
            <div className="rounded-lg border border-border bg-card p-4 flex flex-col justify-between hover:border-primary/30 hover:scale-[1.02] hover:shadow-lg transition-all duration-300 select-none cursor-help" />
          }
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Cpu size={14} className="text-emerald-500" />
              CPU USAGE
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400">{cpuPercent}%</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold tracking-tight">{cpuPercent}%</span>
            <span className="text-[10px] text-muted-foreground font-mono">4 Cores Online</span>
          </div>

          {/* Live Sparkline Area */}
          <div className="h-12 w-full mt-4 relative overflow-hidden">
            <svg className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d={getAreaPath(cpuHistory, 300, 48)} fill="url(#cpuGrad)" />
              <path d={getSparklinePath(cpuHistory, 300, 48)} fill="none" stroke="#10b981" strokeWidth="1.5" />
            </svg>
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-popover border border-border text-foreground font-mono text-xs">
          Real-time CPU utilization. Fluctuating between 5% and 95%.
        </TooltipContent>
      </Tooltip>

      {/* RAM Card */}
      <Tooltip>
        <TooltipTrigger
          render={
            <div className="rounded-lg border border-border bg-card p-4 flex flex-col justify-between hover:border-primary/30 hover:scale-[1.02] hover:shadow-lg transition-all duration-300 select-none cursor-help" />
          }
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={14} className="text-primary" />
              MEMORY (RAM)
            </span>
            <span className="text-xs font-mono font-bold text-primary">{ramPercent}%</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold tracking-tight">{ramVal.toFixed(1)} GB</span>
            <span className="text-[10px] text-muted-foreground font-mono">of {ramTotal.toFixed(1)} GB</span>
          </div>

          {/* Live Sparkline Area */}
          <div className="h-12 w-full mt-4 relative overflow-hidden">
            <svg className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d={getAreaPath(ramHistory, 300, 48)} fill="url(#ramGrad)" />
              <path d={getSparklinePath(ramHistory, 300, 48)} fill="none" stroke="var(--primary)" strokeWidth="1.5" />
            </svg>
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-popover border border-border text-foreground font-mono text-xs">
          Available memory capacity. Currently using {ramVal.toFixed(1)} GB of {ramTotal.toFixed(1)} GB.
        </TooltipContent>
      </Tooltip>

      {/* Disk Card */}
      <Tooltip>
        <TooltipTrigger
          render={
            <div className="rounded-lg border border-border bg-card p-4 flex flex-col justify-between hover:border-primary/30 hover:scale-[1.02] hover:shadow-lg transition-all duration-300 select-none cursor-help" />
          }
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <HardDrive size={14} className="text-amber-500" />
              STORAGE (NVMe)
            </span>
            <span className="text-xs font-mono font-bold text-amber-400">{diskPercent}%</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold tracking-tight">{diskVal} GB</span>
            <span className="text-[10px] text-muted-foreground font-mono">used / {diskTotal} GB</span>
          </div>

          {/* Custom Progress Bar Segment */}
          <div className="mt-4 space-y-1.5">
            <div className="h-1.5 w-full rounded-full bg-neutral-900 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-500"
                style={{ width: `${diskPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground">
              <span>Cache: 18.4 GB</span>
              <span>Available: {diskTotal - diskVal} GB</span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-popover border border-border text-foreground font-mono text-xs">
          Physical NVMe disk allocations. Partition path: `/dev/nvme0n1p2`.
        </TooltipContent>
      </Tooltip>

      {/* Network I/O Card */}
      <Tooltip>
        <TooltipTrigger
          render={
            <div className="rounded-lg border border-border bg-card p-4 flex flex-col justify-between hover:border-primary/30 hover:scale-[1.02] hover:shadow-lg transition-all duration-300 select-none cursor-help" />
          }
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Network size={14} className="text-cyan-500" />
              NETWORK BANDWIDTH
            </span>
            <span className="text-[9px] font-mono font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-900/60 rounded px-1.5 uppercase">
              Active: 2.1k
            </span>
          </div>
          <div className="mt-3 flex flex-col">
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-mono font-semibold text-neutral-300">
                ↓ {netDown.toFixed(1)} MB/s
              </span>
              <span className="text-[9px] font-mono text-muted-foreground">Inbound</span>
            </div>
            <div className="flex justify-between items-baseline mt-0.5">
              <span className="text-sm font-mono font-semibold text-neutral-400">
                ↑ {netUp.toFixed(1)} MB/s
              </span>
              <span className="text-[9px] font-mono text-muted-foreground">Outbound</span>
            </div>
          </div>

          {/* Multi Sparkline Area */}
          <div className="h-10 w-full mt-3 relative overflow-hidden">
            <svg className="w-full h-full" preserveAspectRatio="none">
              {/* Downstream Inbound */}
              <path
                d={getSparklinePath(netDownHistory, 300, 40)}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="1.2"
                strokeDasharray="2,2"
              />
              {/* Upstream Outbound */}
              <path
                d={getSparklinePath(netUpHistory, 300, 40)}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1"
              />
            </svg>
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-popover border border-border text-foreground font-mono text-xs">
          Active network interfaces: `eth0`. Streaming real-time speeds.
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
