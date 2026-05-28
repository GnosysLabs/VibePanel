"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  Brain,
  Send,
  Sparkles,
  Terminal,
  Paperclip,
  CheckCircle,
  FileCode,
  X,
} from "lucide-react";
import { useAIConfig } from "@/context/AIConfigContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
  codeDiff?: {
    filename: string;
    diff: string;
  };
  action?: {
    label: string;
    onExecute: () => void;
    executed: boolean;
  };
}

function parseMarkdown(text: string): React.ReactNode {
  if (!text) return "";

  // Split by code blocks first
  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      // It's a code block
      const content = part.slice(3, -3).trim();
      const firstLineBreak = content.indexOf("\n");
      let lang = "";
      let code = content;
      if (firstLineBreak !== -1) {
        lang = content.substring(0, firstLineBreak).trim();
        code = content.substring(firstLineBreak + 1);
      }
      return (
        <div key={index} className="my-2 rounded border border-border bg-neutral-950 p-2.5 font-mono text-[10px] text-neutral-200 overflow-x-auto select-text leading-relaxed">
          {lang && <div className="text-[8px] text-muted-foreground uppercase border-b border-border/40 pb-1 mb-1">{lang}</div>}
          <pre>{code}</pre>
        </div>
      );
    }

    // Process inline code, bold, lists, and line breaks
    const subparts = part.split(/(`[^`\n]+`)/g);

    const inlineParsed = subparts.map((subpart, subIdx) => {
      if (subpart.startsWith("`") && subpart.endsWith("`")) {
        return (
          <code key={subIdx} className="bg-neutral-900 border border-border/40 px-1 py-0.5 rounded font-mono text-[10px] text-primary">
            {subpart.slice(1, -1)}
          </code>
        );
      }

      // Handle bold text **text** and list items
      const boldParts = subpart.split(/(\*\*[^*\n]+\*\*)/g);
      return boldParts.map((bPart, bIdx) => {
        if (bPart.startsWith("**") && bPart.endsWith("**")) {
          return (
            <strong key={bIdx} className="font-bold text-foreground">
              {bPart.slice(2, -2)}
            </strong>
          );
        }

        // Handle simple list items starting with "- " or "* "
        if (bPart.startsWith("- ") || bPart.startsWith("* ")) {
          return (
            <span key={bIdx} className="block pl-3 relative my-1">
              <span className="absolute left-0 top-1 text-primary">•</span>
              {bPart.substring(2)}
            </span>
          );
        }

        return bPart;
      });
    });

    // Support rendering newlines as paragraphs/breaks
    return (
      <span key={index} className="whitespace-pre-line">
        {inlineParsed}
      </span>
    );
  });
}

export default function AIAssistantSidebar() {
  const pathname = usePathname();
  const { config, isLoaded } = useAIConfig();
  const [isOpen, setIsOpen] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "Hey! I am your AI Sysadmin. I have full read access to your system metrics, PM2 process trees, Docker stacks, and Caddy proxy logs. What would you like to build or diagnose today?",
      timestamp: new Date(),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Determine context pill based on route
  const getContextPills = () => {
    const pills = ["[Attached: CPU & RAM Metrics]"];
    if (pathname === "/") {
      pills.push("[Attached: Process Map]");
    } else if (pathname === "/containers") {
      pills.push("[Attached: Docker Stack Info]", "[Attached: Docker Logs]");
    } else if (pathname === "/processes") {
      pills.push("[Attached: PM2 Process Tree]", "[Attached: Error Logs]");
    } else if (pathname === "/proxy") {
      pills.push("[Attached: Caddy Configurations]");
    } else if (pathname === "/settings") {
      pills.push("[Attached: Credentials Settings]");
    }
    return pills;
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: input,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (response.ok) {
        const data = await response.json();

        let actionData: Message["action"] = undefined;
        if (data.action) {
          const rawAction = data.action;
          actionData = {
            label: rawAction.label || "Run Command",
            executed: false,
            onExecute: async () => {
              const actionToastId = toast.loading(`Executing command: ${rawAction.label || "Action"}...`);
              try {
                const endpoint = rawAction.type === "container" ? "/api/containers" : "/api/processes";
                const actionRes = await fetch(endpoint, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: rawAction.action, id: rawAction.targetId }),
                });
                if (actionRes.ok) {
                  toast.dismiss(actionToastId);
                  toast.success(`Action successfully executed: ${rawAction.label}`);
                } else {
                  const errJson = await actionRes.json();
                  toast.dismiss(actionToastId);
                  toast.error(errJson.error || `Failed to execute action.`);
                }
              } catch (e: unknown) {
                toast.dismiss(actionToastId);
                const errMsg = e instanceof Error ? e.message : String(e);
                toast.error(`Action failed: ${errMsg}`);
              }
            },
          };
        }

        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: "ai",
            text: data.text || "No response received.",
            timestamp: new Date(),
            codeDiff: data.codeDiff,
            action: actionData,
          },
        ]);
      } else {
        toast.error("Failed to retrieve AI completion.");
      }
    } catch (error) {
      console.error("AI chat communication error:", error);
      toast.error("Failed to connect to the AI assistant backend.");
    } finally {
      setIsTyping(false);
    }
  };

  const handleExecuteAction = (msgId: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === msgId && msg.action) {
          msg.action.onExecute();
          return {
            ...msg,
            action: { ...msg.action, executed: true },
          };
        }
        return msg;
      })
    );
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 size-12 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center border border-primary/30 shadow-lg hover:scale-105 transition-all cursor-pointer group"
        aria-label="Open AI Sysadmin Assistant"
      >
        <Brain className="text-primary-foreground size-5 animate-pulse group-hover:scale-110 transition-transform" />
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-40 w-80 md:w-96 h-[500px] flex flex-col rounded-xl border border-primary/20 bg-card/95 backdrop-blur-md shadow-2xl overflow-hidden transition-all duration-300 select-none animate-in fade-in-50 slide-in-from-bottom-5"
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-border px-4 bg-black/20">
        <div className="flex items-center gap-2 font-mono text-sm font-semibold tracking-wider">
          <Brain size={18} className="text-primary" />
          <span>SYSADMIN AGENT</span>
        </div>
        <div className="flex items-center gap-2">
          {config.apiKey ? (
            <Badge variant="outline" className="bg-emerald-950/20 text-emerald-400 border-emerald-900/60 font-mono text-[9px] gap-1 uppercase">
              <Sparkles size={8} /> Active
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-950/20 text-amber-400 border-amber-900/60 font-mono text-[9px] gap-1 uppercase">
              No API Key
            </Badge>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Close Assistant"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Context pills area */}
      <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-border bg-black/10">
        {getContextPills().map((pill) => (
          <Badge
            key={pill}
            variant="outline"
            className="bg-neutral-900/60 border-neutral-800/80 px-2 py-0.5 text-[8px] text-muted-foreground font-mono font-normal gap-1 hover:text-foreground"
          >
            <Paperclip size={8} className="text-primary" />
            {pill.replace("[Attached: ", "").replace("]", "")}
          </Badge>
        ))}
      </div>

      {/* Chat scroll content */}
      <ScrollArea className="flex-1 min-h-0 p-4">
        <div className="space-y-4 pb-6 font-sans text-xs select-text">
          {messages.map((msg) => {
            const isAi = msg.sender === "ai";
            return (
              <div
                key={msg.id}
                className={`flex flex-col space-y-1.5 ${
                  isAi ? "items-start" : "items-end"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-3 leading-relaxed border ${
                    isAi
                      ? "bg-neutral-900/50 border-border/60 text-foreground shadow-sm"
                      : "bg-primary border-none text-primary-foreground font-medium shadow-md shadow-primary/5"
                  }`}
                >
                  {parseMarkdown(msg.text)}

                  {/* Docker Compose Diff Render */}
                  {isAi && msg.codeDiff && (
                    <div className="mt-3 overflow-hidden rounded-md border border-border bg-neutral-950 text-[10px] font-mono">
                      <div className="flex items-center justify-between border-b border-border px-2.5 py-1.5 bg-neutral-900/40 text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <FileCode size={11} className="text-primary" />
                          <span>{msg.codeDiff.filename}</span>
                        </div>
                        <span className="text-[8px] uppercase tracking-wide">Diff View</span>
                      </div>
                      <pre className="overflow-x-auto p-2.5 text-neutral-300 leading-tight select-text scrollbar-thin">
                        {msg.codeDiff.diff}
                      </pre>
                    </div>
                  )}

                  {/* 1-Click Action Render */}
                  {isAi && msg.action && (
                    <div className="mt-3">
                      {msg.action.executed ? (
                        <div className="flex items-center gap-1.5 rounded border border-emerald-950 bg-emerald-950/20 px-3 py-2 text-xs font-mono text-emerald-400">
                          <CheckCircle size={14} />
                          <span>Executed Successfully</span>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => handleExecuteAction(msg.id)}
                          className="w-full flex items-center justify-center gap-1.5 h-8 font-mono text-xs text-primary border-primary/20 bg-primary/10 hover:bg-primary/20 hover:text-foreground cursor-pointer transition-all"
                        >
                          <Terminal size={12} />
                          <span>{msg.action.label}</span>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <span className="text-[8px] text-muted-foreground px-1 font-mono">
                  {msg.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-mono pl-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></span>
              <span>Agent is formulating a plan...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </ScrollArea>

      {/* Input Form */}
      <div className="border-t border-border p-3 bg-black/20">
        <div className="flex items-center rounded-md border border-border bg-neutral-950/50 px-2.5 py-1">
          <input
            type="text"
            placeholder={
              config.apiKey
                ? "Deploy postgres db... / Reload server..."
                : "Configure your API key in settings to prompt..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
            disabled={!config.apiKey && isLoaded}
            className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground text-foreground border-none focus:ring-0 p-0 h-8"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || (!config.apiKey && isLoaded)}
            className={`rounded p-1 transition-colors cursor-pointer shrink-0 ${
              input.trim() && (config.apiKey || !isLoaded)
                ? "text-primary hover:bg-neutral-900"
                : "text-muted-foreground cursor-not-allowed"
            }`}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
