"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import AIAssistantSidebar from "@/components/AIAssistantSidebar";
import CommandPalette from "@/components/CommandPalette";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <div className="min-h-screen w-screen bg-background">{children}</div>;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background p-6 md:p-8 relative">
        {children}
      </main>
      <AIAssistantSidebar />
      <CommandPalette />
    </div>
  );
}
