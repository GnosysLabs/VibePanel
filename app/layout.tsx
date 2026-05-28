import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AIConfigProvider } from "@/context/AIConfigContext";
import Sidebar from "@/components/Sidebar";
import AIAssistantSidebar from "@/components/AIAssistantSidebar";
import CommandPalette from "@/components/CommandPalette";
import AppShell from "@/components/AppShell";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VibePanel - AI-Forward Server Management",
  description: "Next-generation dashboard bringing shadcn aesthetics to self-hosted dev servers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      style={{ colorScheme: "dark" }}
    >
      <body className="min-h-full bg-background text-foreground flex flex-col font-sans overflow-hidden">
        <AIConfigProvider>
          <TooltipProvider delay={150}>
            <AppShell>{children}</AppShell>
            <Toaster theme="dark" closeButton richColors />
          </TooltipProvider>
        </AIConfigProvider>
      </body>
    </html>
  );
}
