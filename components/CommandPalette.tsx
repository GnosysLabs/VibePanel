"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Terminal,
  Play,
  RotateCw,
  Trash2,
  Cpu,
  Box,
  Settings,
  HelpCircle,
} from "lucide-react";

interface CommandItem {
  id: string;
  name: string;
  category: "Navigation" | "Actions" | "System";
  icon: React.ComponentType<{ size: number; className?: string }>;
  shortcut?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: (router: any, extra?: any) => void;
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
    {
      id: "nav-dash",
      name: "Go to Dashboard",
      category: "Navigation",
      icon: Cpu,
      shortcut: "G D",
      action: (r) => r.push("/"),
    },
    {
      id: "nav-cont",
      name: "Go to Docker Containers",
      category: "Navigation",
      icon: Box,
      shortcut: "G C",
      action: (r) => r.push("/containers"),
    },
    {
      id: "nav-proc",
      name: "Go to PM2 Processes",
      category: "Navigation",
      icon: Cpu,
      shortcut: "G P",
      action: (r) => r.push("/processes"),
    },
    {
      id: "nav-prox",
      name: "Go to Proxy Setup",
      category: "Navigation",
      icon: Play,
      shortcut: "G R",
      action: (r) => r.push("/proxy"),
    },
    {
      id: "nav-sett",
      name: "Go to AI Settings",
      category: "Navigation",
      icon: Settings,
      shortcut: "G S",
      action: (r) => r.push("/settings"),
    },
    {
      id: "act-restart-pm2",
      name: "Restart PM2 Process: api-server",
      category: "Actions",
      icon: RotateCw,
      action: () => alert("Restarted native PM2 process 'api-server'"),
    },
    {
      id: "act-restart-docker",
      name: "Restart Docker Container: postgres-db",
      category: "Actions",
      icon: RotateCw,
      action: () => alert("Restarted container 'postgres-db'"),
    },
    {
      id: "act-purge-cache",
      name: "Purge Docker Build Caches (Recover 18.4 GB)",
      category: "Actions",
      icon: Trash2,
      action: () => alert("Cleared 18.4 GB of system cache"),
    },
    {
      id: "sys-logs",
      name: "Stream System Metrics to terminal",
      category: "System",
      icon: Terminal,
      action: () => alert("Streaming metrics..."),
    },
  ];

  // Open / Close with keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Sync state with HTML dialog element
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
      inputRef.current?.focus();
      // Reset search and selection asynchronously to avoid synchronous cascading renders in useEffect
      setTimeout(() => {
        setSearch("");
        setSelectedIndex(0);
      }, 0);
    } else {
      dialog.close();
    }
  }, [isOpen]);

  // Handle dialog dismissals via Esc key
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = () => setIsOpen(false);
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, []);

  // Filtered commands
  const filtered = commands.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.category.toLowerCase().includes(search.toLowerCase())
  );

  // Keyboard navigation inside list
  const handleKeyDownList = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        runCommand(filtered[selectedIndex]);
      }
    }
  };

  const runCommand = (cmd: CommandItem) => {
    startTransition(() => {
      cmd.action(router);
      setIsOpen(false);
    });
  };

  // Close dialog on clicking backdrop
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (e.target === dialog) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Visual Indicator Button on Bottom-Left */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full border border-border bg-neutral-950/80 backdrop-blur-md px-4 py-2 font-mono text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-neutral-900/80 transition-all duration-300 shadow-md cursor-pointer select-none"
      >
        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-glow-green"></span>
        <span>Press</span>
        <kbd className="rounded bg-neutral-900 px-1.5 py-0.5 text-[9px] font-sans border border-neutral-800 font-semibold text-neutral-400">⌘K</kbd>
        <span>to execute</span>
      </button>

      <dialog
        ref={dialogRef}
        onClick={handleBackdropClick}
        className="backdrop:bg-black/80 backdrop:backdrop-blur-sm rounded-lg border border-border bg-card p-0 shadow-2xl outline-none w-full max-w-xl text-foreground select-none overflow-hidden transition-all duration-300"
      >
        <div className="flex items-center border-b border-border px-4 py-3 bg-neutral-950/30">
          <Search size={18} className="text-muted-foreground mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search panel..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDownList}
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground border-none focus:ring-0 p-0 h-8 font-mono"
          />
          <span className="text-[10px] text-muted-foreground border border-border bg-neutral-900/60 rounded px-1.5 py-0.5 font-mono ml-2 uppercase shrink-0 select-none">
            ESC
          </span>
        </div>

        <div className="max-h-[300px] overflow-y-auto p-2.5 space-y-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground text-xs">
              <HelpCircle size={20} className="mb-2 text-neutral-600" />
              <span>No commands found matching &quot;{search}&quot;</span>
            </div>
          ) : (
            // Grouping by Category
            ["Navigation", "Actions", "System"].map((category) => {
              const items = filtered.filter((c) => c.category === category);
              if (items.length === 0) return null;

              return (
                <div key={category} className="space-y-1">
                  <div className="px-3 py-1.5 text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
                    {category}
                  </div>
                  {items.map((cmd) => {
                    const globalIdx = filtered.findIndex((x) => x.id === cmd.id);
                    const isSelected = globalIdx === selectedIndex;
                    const Icon = cmd.icon;

                    return (
                      <div
                        key={cmd.id}
                        onClick={() => runCommand(cmd)}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        className={`flex items-center justify-between rounded px-3 py-2 text-xs font-mono transition-all cursor-pointer ${
                          isSelected
                            ? "bg-primary/10 text-foreground border-l-2 border-primary font-semibold shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-neutral-900/30"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon size={14} className="shrink-0" />
                          <span>{cmd.name}</span>
                        </div>
                        {cmd.shortcut ? (
                          <div className="flex items-center gap-1">
                            {cmd.shortcut.split(" ").map((key) => (
                              <kbd
                                key={key}
                                className="rounded bg-neutral-900 px-1.5 py-0.5 text-[9px] border border-neutral-850 text-neutral-400 font-sans font-semibold"
                              >
                                {key}
                              </kbd>
                            ))}
                          </div>
                        ) : (
                          isSelected && (
                            <span className="text-[10px] text-muted-foreground font-mono font-normal">↵ Enter</span>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </dialog>
    </>
  );
}
