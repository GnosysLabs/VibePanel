"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Box,
  Cpu,
  Globe,
  Settings,
  ChevronLeft,
  ChevronRight,
  Brain,
  LogOut,
} from "lucide-react";
import { useAIConfig } from "@/context/AIConfigContext";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { config, isLoaded } = useAIConfig();

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });
      if (response.ok) {
        window.location.href = "/login";
      }
    } catch {
      alert("Failed to log out");
    }
  };

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Containers", href: "/containers", icon: Box },
    { name: "Processes", href: "/processes", icon: Cpu },
    { name: "Proxy", href: "/proxy", icon: Globe },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const getProviderLabel = () => {
    if (!isLoaded) return "Loading...";
    if (!config.apiKey) return "AI Setup Required";
    switch (config.provider) {
      case "anthropic":
        return "Anthropic (Claude)";
      case "openai":
        return "OpenAI (GPT)";
      case "openrouter":
        return "OpenRouter";
      default:
        return "AI Custom";
    }
  };

  return (
    <aside
      className={`relative flex flex-col border-r border-border bg-sidebar transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      } h-screen shrink-0 text-foreground select-none`}
    >
      {/* Brand header */}
      <div className="flex h-14 items-center justify-between px-4">
        {!isCollapsed && (
          <div className="flex items-center gap-2 font-mono text-xs font-bold tracking-widest text-primary uppercase">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-glow-green"></span>
            VIBEPANEL
          </div>
        )}
        {isCollapsed && (
          <div className="mx-auto flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 animate-glow-green" />
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <Separator />

      {/* Nav items */}
      <nav className="flex-1 space-y-1.5 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          const link = (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                isActive
                  ? "bg-accent text-accent-foreground border-l-2 border-primary shadow-sm"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <Icon size={16} className="shrink-0" />
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          );

          if (isCollapsed) {
            return (
              <Tooltip key={item.name}>
                <TooltipTrigger render={link} />
                <TooltipContent side="right" className="bg-popover border border-border text-foreground font-mono text-xs">
                  {item.name}
                </TooltipContent>
              </Tooltip>
            );
          }

          return link;
        })}
      </nav>

      {/* Logout button */}
      <div className="px-3 py-2 border-t border-border/40">
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-red-950/20 hover:text-red-400 cursor-pointer transition-colors"
                />
              }
            >
              <LogOut size={16} className="shrink-0" />
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-popover border border-border text-foreground font-mono text-xs">
              Logout
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-red-950/20 hover:text-red-400 cursor-pointer transition-colors"
          >
            <LogOut size={16} className="shrink-0" />
            <span>Logout</span>
          </button>
        )}
      </div>

      {/* Footer Info / AI status */}
      <div className="border-t border-border p-4 bg-black/20">
        <div className="flex items-center gap-2">
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <div className="mx-auto cursor-help" />
                }
              >
                <Brain
                  size={18}
                  className={`shrink-0 ${
                    config.apiKey ? "text-primary animate-pulse" : "text-amber-500"
                  }`}
                />
              </TooltipTrigger>
              <TooltipContent side="right" className="flex flex-col gap-0.5 bg-popover border border-border text-foreground font-mono text-xs">
                <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
                  Agent Engine
                </span>
                <span className="text-xs font-semibold">
                  {getProviderLabel()}
                </span>
              </TooltipContent>
            </Tooltip>
          ) : (
            <>
              <Brain
                size={18}
                className={`shrink-0 ${
                  config.apiKey ? "text-primary animate-pulse" : "text-amber-500"
                }`}
              />
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
                  Agent Engine
                </span>
                <span className="text-xs font-semibold truncate text-foreground/90">
                  {getProviderLabel()}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
