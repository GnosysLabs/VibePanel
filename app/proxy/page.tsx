"use client";

import React, { useState, useEffect } from "react";
import {
  Globe,
  Plus,
  ArrowRight,
  Shield,
  Trash2,
  Lock,
  Search,
  Code,
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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface ProxyRule {
  id: string;
  domain: string;
  target: string;
  ssl: boolean;
  sslExpiry: string;
  status: "active" | "error";
}

export default function ProxyPage() {
  const [activeProxyTab, setActiveProxyTab] = useState<"caddy" | "nginx">("nginx");
  const [rules, setRules] = useState<ProxyRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newSsl, setNewSsl] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchRules = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const response = await fetch("/api/proxy");
      if (response.ok) {
        const data = await response.json();
        setRules(data.rules || []);
      }
    } catch (error) {
      console.error("Failed to fetch proxy rules:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRules(true);
  }, []);

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim() || !newTarget.trim()) return;

    const toastId = toast.loading(`Registering domain proxy for ${newDomain}...`);
    try {
      const response = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomain, target: newTarget, ssl: newSsl }),
      });
      if (response.ok) {
        toast.dismiss(toastId);
        toast.success("Proxy Endpoint Deployed", {
          description: `Successfully registered domain proxy for ${newDomain}`,
          duration: 4000,
        });
        setNewDomain("");
        setNewTarget("");
        setShowAddForm(false);
        fetchRules();
      } else {
        const err = await response.json();
        toast.dismiss(toastId);
        toast.error(err.error || "Failed to deploy proxy mapping.");
      }
    } catch {
      toast.dismiss(toastId);
      toast.error("Failed to deploy proxy mapping.");
    }
  };

  const handleDeleteRule = async (id: string, domain: string) => {
    if (confirm(`Are you sure you want to delete proxy mapping for ${domain}?`)) {
      const toastId = toast.loading(`Deleting proxy rule for ${domain}...`);
      try {
        const response = await fetch(`/api/proxy?id=${id}`, {
          method: "DELETE",
        });
        if (response.ok) {
          toast.dismiss(toastId);
          toast.info(`Deleted proxy routing rule for ${domain}`);
          fetchRules();
        } else {
          toast.dismiss(toastId);
          toast.error("Failed to delete proxy routing rule.");
        }
      } catch {
        toast.dismiss(toastId);
        toast.error("Failed to delete proxy routing rule.");
      }
    }
  };

  const filtered = rules.filter((r) =>
    r.domain.toLowerCase().includes(search.toLowerCase()) ||
    r.target.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 select-none pb-12 font-mono text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Globe className="text-primary" />
            REVERSE PROXY MANAGER
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Expose local ports to public domains and inspect automatic configuration structures for Nginx or Caddy.
          </p>
        </div>

        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5 cursor-pointer font-mono text-xs text-foreground bg-neutral-905 border-border"
        >
          <Plus size={14} />
          <span>{showAddForm ? "Cancel Form" : "Expose New Domain"}</span>
        </Button>
      </div>

      {/* Expose Domain Form */}
      {showAddForm && (
        <Card className="border border-border bg-card max-w-xl">
          <CardHeader>
            <CardTitle className="text-sm font-semibold tracking-wider text-foreground">
              EXPOSE PORT TO VIRTUAL HOST
            </CardTitle>
            <CardDescription className="text-[10px]">
              Provision internal target proxy bindings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddRule} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="text-muted-foreground block text-[10px]">Domain Name</span>
                  <Input
                    type="text"
                    placeholder="e.g. app.my-domain.com"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    required
                    className="w-full bg-neutral-950 border-border font-mono text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-muted-foreground block text-[10px]">Target Port (Local)</span>
                  <Input
                    type="text"
                    placeholder="e.g. http://localhost:8080"
                    value={newTarget}
                    onChange={(e) => setNewTarget(e.target.value)}
                    required
                    className="w-full bg-neutral-950 border-border font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 py-1.5">
                <Switch
                  id="sslSwitch"
                  checked={newSsl}
                  onCheckedChange={setNewSsl}
                />
                <label htmlFor="sslSwitch" className="text-muted-foreground flex items-center gap-1 cursor-pointer select-none">
                  <Lock size={11} className="text-emerald-500" />
                  <span>Enable Automatic HTTPS / SSL Certificate (Let&apos;s Encrypt)</span>
                </label>
              </div>

              <Button
                type="submit"
                className="w-full rounded-lg bg-primary text-primary-foreground font-bold cursor-pointer text-xs"
              >
                Deploy Proxy Endpoint
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Main grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rules Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center rounded-lg border border-border bg-neutral-900/40 px-3 py-1">
            <Search size={14} className="text-muted-foreground mr-2 shrink-0" />
            <Input
              type="text"
              placeholder="Search domain rules or ports..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent border-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-xs text-foreground h-9"
            />
          </div>

          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader className="bg-black/20 text-[10px] uppercase">
                <TableRow>
                  <TableHead className="p-3">Domain Name</TableHead>
                  <TableHead className="p-3">Local Target</TableHead>
                  <TableHead className="p-3">SSL Certificate</TableHead>
                  <TableHead className="p-3 text-right">Delete</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} className="hover:bg-neutral-900/30 transition-colors">
                    <TableCell className="p-3">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <Globe size={13} className="text-muted-foreground" />
                        <span>{r.domain}</span>
                      </div>
                    </TableCell>
                    <TableCell className="p-3">
                      <div className="flex items-center gap-1 text-[10px] text-neutral-300">
                        <span>{r.target}</span>
                        <ArrowRight size={10} className="text-muted-foreground" />
                      </div>
                    </TableCell>
                    <TableCell className="p-3">
                      {r.ssl ? (
                        <div className="flex flex-col gap-0.5">
                          <Badge variant="outline" className="bg-emerald-950/20 text-emerald-400 border-emerald-900/60 font-mono text-[9px] gap-1 uppercase w-fit py-0">
                            <Shield size={10} />
                            Secured
                          </Badge>
                          <span className="text-[8px] text-muted-foreground font-mono mt-0.5">
                            {r.sslExpiry}
                          </span>
                        </div>
                      ) : (
                        <span className="text-neutral-500">Disabled</span>
                      )}
                    </TableCell>
                    <TableCell className="p-3 text-right">
                      {r.id.startsWith("nginx-") ? (
                        <span className="text-[10px] text-muted-foreground font-mono italic pr-2">
                          System Managed
                        </span>
                      ) : (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDeleteRule(r.id, r.domain)}
                          className="h-7 w-7 hover:bg-neutral-950 border border-border text-muted-foreground hover:text-red-400 cursor-pointer transition-colors"
                          title="Delete routing rule"
                        >
                          <Trash2 size={11} />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Live Config Render Panel */}
        <Card className="border border-border bg-card flex flex-col justify-between h-[410px]">
          <CardHeader className="border-b border-border/60 pb-2 mb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold tracking-wider text-foreground flex items-center gap-1.5">
                <Code size={13} className="text-primary" />
                <span>Active Configuration</span>
              </CardTitle>
              <CardDescription className="text-[8px] uppercase text-muted-foreground">Read-Only</CardDescription>
            </div>
            
            {/* Tabs selector */}
            <div className="flex gap-1 mt-2 bg-neutral-900/50 p-0.5 rounded border border-border/30 w-fit">
              <button
                onClick={() => setActiveProxyTab("nginx")}
                className={`px-2 py-0.5 text-[9px] font-mono rounded cursor-pointer transition-colors ${
                  activeProxyTab === "nginx"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                NGINX
              </button>
              <button
                onClick={() => setActiveProxyTab("caddy")}
                className={`px-2 py-0.5 text-[9px] font-mono rounded cursor-pointer transition-colors ${
                  activeProxyTab === "caddy"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                CADDY
              </button>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <ScrollArea className="h-[235px] rounded-lg bg-black/40 border border-neutral-950 p-3 font-mono text-[9px] text-zinc-300 leading-normal select-text">
              {activeProxyTab === "nginx" ? (
                <div className="space-y-4">
                  {rules.map((r) => (
                    <div key={r.id} className="space-y-1">
                      <div className="text-neutral-500"># Reverse Proxy mapping for {r.domain}</div>
                      <div><span className="text-primary font-semibold">server</span> {"{"}</div>
                      <div className="pl-4"><span className="text-primary font-semibold">listen</span> 80;</div>
                      <div className="pl-4"><span className="text-primary font-semibold">server_name</span> <span className="text-amber-400">{r.domain}</span>;</div>
                      <div className="pl-4 mt-1"><span className="text-primary font-semibold">location</span> / {"{"}</div>
                      <div className="pl-8"><span className="text-primary font-semibold">proxy_pass</span> <span className="text-amber-400">{r.target}</span>;</div>
                      <div className="pl-8"><span className="text-primary font-semibold">proxy_set_header</span> Host $host;</div>
                      <div className="pl-8"><span className="text-primary font-semibold">proxy_set_header</span> X-Real-IP $remote_addr;</div>
                      <div className="pl-4">{"}"}</div>
                      <div>{"}"}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {rules.map((r) => (
                    <div key={r.id} className="space-y-1">
                      <div className="text-neutral-500"># Reverse Proxy mapping for {r.domain}</div>
                      <div>
                        <span className="text-primary font-bold">{r.domain}</span> {"{"}
                      </div>
                      <div className="pl-4">
                        reverse_proxy <span className="text-amber-400">{r.target.replace("http://", "")}</span>
                      </div>
                      <div>{"}"}</div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
          <div className="text-[9px] text-muted-foreground text-center p-3 border-t border-border/40">
            Managed automatically via active reverse proxy configuration sync.
          </div>
        </Card>
      </div>
    </div>
  );
}
