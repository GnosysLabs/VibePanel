"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type AIProvider = "anthropic" | "openai" | "openrouter";

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
}

interface AIConfigContextType {
  config: AIConfig;
  setProvider: (provider: AIProvider) => void;
  setApiKey: (apiKey: string) => void;
  setModel: (model: string) => void;
  saveConfig: (newConfig: AIConfig) => Promise<void>;
  isLoaded: boolean;
}

const DEFAULT_CONFIG: AIConfig = {
  provider: "anthropic",
  apiKey: "",
  model: "claude-3-5-sonnet",
};

const AIConfigContext = createContext<AIConfigContextType | undefined>(undefined);

export function AIConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AIConfig>(DEFAULT_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load config on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch("/api/config");
        if (response.ok) {
          const data = await response.json();
          setConfig({
            provider: data.provider || "anthropic",
            apiKey: data.apiKey || "",
            model: data.model || "claude-3-5-sonnet",
          });
        }
      } catch (e) {
        console.error("Failed to load AI config from server:", e);
      } finally {
        setIsLoaded(true);
      }
    };
    fetchConfig();
  }, []);

  const setProvider = (provider: AIProvider) => {
    setConfig((prev) => {
      // Pick a default model when switching providers
      let defaultModel = prev.model;
      if (provider === "anthropic") defaultModel = "claude-3-5-sonnet";
      else if (provider === "openai") defaultModel = "gpt-4o";
      else if (provider === "openrouter") defaultModel = "google/gemini-2.5-pro";

      return {
        ...prev,
        provider,
        model: defaultModel,
      };
    });
  };

  const setApiKey = (apiKey: string) => {
    setConfig((prev) => ({ ...prev, apiKey }));
  };

  const setModel = (model: string) => {
    setConfig((prev) => ({ ...prev, model }));
  };

  const saveConfig = async (newConfig: AIConfig) => {
    // Optimistic update
    setConfig(newConfig);
    try {
      const response = await fetch("/api/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newConfig),
      });
      if (!response.ok) {
        throw new Error("Failed to save config to server");
      }
    } catch (e) {
      console.error("Failed to save AI config to server:", e);
      throw e;
    }
  };

  return (
    <AIConfigContext.Provider
      value={{
        config,
        setProvider,
        setApiKey,
        setModel,
        saveConfig,
        isLoaded,
      }}
    >
      {children}
    </AIConfigContext.Provider>
  );
}

export function useAIConfig() {
  const context = useContext(AIConfigContext);
  if (context === undefined) {
    throw new Error("useAIConfig must be used within an AIConfigProvider");
  }
  return context;
}
