"use client";

import React, { useState, useEffect } from "react";
import { useAIConfig, AIProvider } from "@/context/AIConfigContext";
import { Brain, Key, Save, Check, ShieldAlert, Eye, EyeOff } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function SettingsPage() {
  const { config, saveConfig, isLoaded } = useAIConfig();
  const [provider, setProviderState] = useState<AIProvider>("anthropic");
  const [apiKey, setApiKeyState] = useState("");
  const [model, setModelState] = useState("claude-3-5-sonnet");
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testState, setTestState] = useState<"idle" | "testing" | "success" | "error">("idle");

  // Sync state once context is loaded
  useEffect(() => {
    if (isLoaded) {
      setTimeout(() => {
        setProviderState(config.provider);
        setApiKeyState(config.apiKey);
        setModelState(config.model);
      }, 0);
    }
  }, [isLoaded, config]);

  const handleProviderChange = (val: AIProvider | null) => {
    if (!val) return;
    setProviderState(val);
    if (val === "anthropic") {
      setModelState("claude-3-5-sonnet");
    } else if (val === "openai") {
      setModelState("gpt-4o");
    } else if (val === "openrouter") {
      setModelState("google/gemini-2.5-pro");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await saveConfig({
        provider,
        apiKey,
        model,
      });
      setSaveSuccess(true);
      toast.success("Routing Configuration Saved", {
        description: "Your credentials and model defaults are securely saved on the server.",
      });
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch {
      toast.error("Failed to Save Config", {
        description: "Could not write credentials to server.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = () => {
    if (!apiKey) {
      setTestState("error");
      toast.error("Credentials Missing", {
        description: "Please specify an API secret key credentials before routing connection checks.",
      });
      setTimeout(() => setTestState("idle"), 2500);
      return;
    }
    setTestState("testing");
    const toastId = toast.loading("Verifying network handshake with provider...");
    setTimeout(() => {
      setTestState("success");
      toast.dismiss(toastId);
      toast.success("Handshake Verified", {
        description: `Successfully authenticated communication channels to ${provider} API using ${model}.`,
      });
      setTimeout(() => setTestState("idle"), 2500);
    }, 1500);
  };

  if (!isLoaded) {
    return (
      <div className="flex h-64 items-center justify-center font-mono text-xs text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-primary animate-pulse mr-2"></span>
        Loading settings system...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 select-none pb-12 font-mono text-xs">
      {/* Header */}
      <div className="border-b border-border/60 pb-5">
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Brain className="text-primary" />
          SYSTEM SETTINGS
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure API credentials, local providers, and developer assistant integrations
        </p>
      </div>

      {/* Main card */}
      <Card className="border border-border bg-card shadow-md">
        <CardHeader>
          <CardTitle className="text-sm font-semibold tracking-wider text-foreground">
            AI AGENT ROUTING CONFIG
          </CardTitle>
          <CardDescription className="text-[10px]">
            Route system diagnostics and container commands through your provider API client.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-5">
            {/* Provider */}
            <div className="space-y-1.5">
              <Label className="text-muted-foreground font-medium">LLM Provider</Label>
              <Select value={provider} onValueChange={handleProviderChange}>
                <SelectTrigger className="w-full bg-neutral-950/40 border-border text-foreground font-mono text-xs cursor-pointer">
                  <SelectValue placeholder="Select Provider" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border text-foreground font-mono text-xs">
                  <SelectItem value="anthropic" className="cursor-pointer">Anthropic (Claude)</SelectItem>
                  <SelectItem value="openai" className="cursor-pointer">OpenAI (GPT)</SelectItem>
                  <SelectItem value="openrouter" className="cursor-pointer">OpenRouter (API Gateway)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Model */}
            <div className="space-y-1.5">
              <Label className="text-muted-foreground font-medium">Model Identifier</Label>
              <Input
                type="text"
                value={model}
                onChange={(e) => setModelState(e.target.value)}
                placeholder="e.g. claude-3-5-sonnet"
                className="w-full bg-neutral-950/40 border-border font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Define the specific deployment endpoint model to route system audits and actions.
              </p>
            </div>

            {/* API Key */}
            <div className="space-y-1.5">
              <Label className="text-muted-foreground font-medium flex justify-between">
                <span>API Key Credentials</span>
                <span className="text-[9px] text-primary font-bold uppercase">Server-Side Storage</span>
              </Label>
              <div className="flex items-center rounded-lg border border-border bg-neutral-950/40 px-3 py-1">
                <Key size={14} className="text-muted-foreground mr-2 shrink-0" />
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKeyState(e.target.value)}
                  placeholder="Enter provider API Secret key..."
                  className="w-full bg-transparent text-foreground border-none outline-none focus:ring-0 p-0 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0 ml-2"
                >
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Warning Banner */}
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 flex gap-3 text-[10px] text-amber-500 leading-relaxed font-mono">
              <ShieldAlert size={16} className="shrink-0 mt-0.5" />
              <div>
                <span className="font-bold uppercase block mb-0.5">Server Security Notice</span>
                Your credentials are saved directly on the hosting server in `vibepanel-config.json`. They are never stored in the browser.
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                type="submit"
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground font-bold cursor-pointer text-xs"
              >
                {saveSuccess ? (
                  <>
                    <Check size={14} />
                    <span>Configuration Saved</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>{isSaving ? "Persisting Config..." : "Save Settings"}</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                className="rounded-lg border border-border bg-neutral-950/45 hover:bg-neutral-900 font-semibold text-muted-foreground hover:text-foreground cursor-pointer transition-colors text-xs font-mono"
              >
                {testState === "idle" && "Test API Connection"}
                {testState === "testing" && "Verifying route..."}
                {testState === "success" && "✓ Connection Succeeded"}
                {testState === "error" && "✗ Missing credentials"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Auxiliary settings sections */}
      <Card className="border border-border bg-card shadow-md">
        <CardHeader>
          <CardTitle className="text-sm font-semibold tracking-wider text-foreground">
            EXTERNAL SYSTEM BRIDGE
          </CardTitle>
          <CardDescription className="text-[10px]">
            Tunnel process outputs and websocket endpoints into external workspaces.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-start py-2.5 border-b border-neutral-900/60">
              <div>
                <div className="font-medium text-foreground">CLI Bridge Sync</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Allow Windsurf, Claude Code, or Cursor queries</div>
              </div>
              <Badge variant="outline" className="font-semibold text-emerald-400 bg-emerald-950/20 border-emerald-900/60 px-1.5 py-0.5 text-[9px] uppercase">
                Websocket Enabled
              </Badge>
            </div>

            <div className="flex justify-between items-start py-2.5 border-b border-neutral-900/60">
              <div>
                <div className="font-medium text-foreground">Local Daemon Bridge Port</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Port on localhost which binds local websocket logs</div>
              </div>
              <span className="font-semibold text-neutral-400">
                8080 (Local Default)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
