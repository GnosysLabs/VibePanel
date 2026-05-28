"use client";

import React, { useState } from "react";
import { Lock, ShieldAlert, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        toast.success("Authentication successful", {
          description: "Redirecting to VibePanel dashboard...",
        });
        // Force refresh all layouts by modifying window.location
        window.location.href = "/";
      } else {
        const data = await response.json();
        setError(data.error || "Invalid username or password");
        toast.error("Sign In Failed");
      }
    } catch {
      setError("Unable to connect to the authentication server");
      toast.error("Network error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 select-none">
      <Card className="w-full max-w-sm border border-border bg-card shadow-xl select-none">
        <CardHeader className="space-y-1.5 pb-4 border-b border-border/40">
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-widest text-primary uppercase select-none">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-glow-green"></span>
            SECURITY DAEMON
          </div>
          <CardTitle className="text-sm font-mono font-bold tracking-wider uppercase text-foreground">
            SIGN IN TO VIBEPANEL
          </CardTitle>
          <CardDescription className="text-[10px] font-mono text-muted-foreground leading-normal">
            A secure gateway to PM2 processes, Docker stacks, and server metrics.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5 font-mono text-xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 flex gap-2 text-[10px] text-red-400 leading-relaxed font-mono">
                <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-muted-foreground font-medium block">Username</label>
              <div className="flex items-center rounded-lg border border-border bg-neutral-950/40 px-3 py-1">
                <Lock size={13} className="text-muted-foreground mr-2 shrink-0" />
                <Input
                  type="text"
                  placeholder="Enter administrator username..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  required
                  className="w-full bg-transparent border-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-xs font-mono h-8 text-foreground"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-muted-foreground font-medium block">Password</label>
              <div className="flex items-center rounded-lg border border-border bg-neutral-950/40 px-3 py-1">
                <Key size={13} className="text-muted-foreground mr-2 shrink-0" />
                <input
                  type="password"
                  placeholder="Enter administrator password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  className="w-full bg-transparent text-foreground border-none outline-none focus:ring-0 p-0 text-xs font-mono h-8"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground font-bold cursor-pointer text-xs h-9 uppercase"
            >
              {isLoading ? "Authorizing session..." : "Verify Identity"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
