"use client";

import { useState } from "react";
import { FlaskConical, MessageCircle, Sparkles } from "lucide-react";
import { ModulePageShell } from "@/components/shared/module-page-shell";
import { ModulePageHeader } from "@/components/shared/module-page-header";
import { WhatsAppExporterPage } from "./whatsapp-exporter/page";
import { AiAgentPage } from "./ai-agent/page";

export function ModuloLaboratorio() {
  const [aba, setAba] = useState<"exporter" | "ai-agent">("exporter");

  return (
    <ModulePageShell>
      <ModulePageHeader
        title="Laboratorio"
        subtitle="Ferramentas experimentais e em desenvolvimento"
        icon={<FlaskConical className="h-5 w-5" />}
        iconTone="amber"
      />

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-muted/30 p-1 border border-border w-fit mb-6">
        <button
          onClick={() => setAba("exporter")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            aba === "exporter"
              ? "bg-background-surface text-foreground shadow-sm"
              : "text-foreground-muted hover:text-foreground"
          }`}
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp Exporter
        </button>
        <button
          onClick={() => setAba("ai-agent")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            aba === "ai-agent"
              ? "bg-background-surface text-foreground shadow-sm"
              : "text-foreground-muted hover:text-foreground"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          AI Agent
        </button>
      </div>

      {aba === "exporter" ? <WhatsAppExporterPage /> : <AiAgentPage />}
    </ModulePageShell>
  );
}
