"use client";

import { useEffect } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { InstanciaSelector } from "../whatsapp-exporter/components/instancia-selector";
import { useWhatsappExporter } from "../whatsapp-exporter/hooks/use-whatsapp-exporter";
import { useAiAgent } from "./hooks/use-ai-agent";
import { ProviderConfigSection } from "./components/provider-config-section";
import { AnalysisReport } from "./components/analysis-report";
import type { LeadAnalysis } from "./types";

export function AiAgentPage() {
  const exporter = useWhatsappExporter();
  const agent = useAiAgent();

  useEffect(() => {
    agent.loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnalyze = () => {
    if (exporter.selectedIds.length === 0) return;
    agent.analyze({
      instanceIds: exporter.selectedIds,
      chatLimit: exporter.config.chatLimit,
      messagesPerChat: exporter.config.messagesPerChat,
    });
  };

  const handleSend = async (lead: LeadAnalysis) => {
    const instanceName = exporter.instances.find(
      (i) => exporter.selectedIds.includes(i.id),
    )?.instance_name;
    if (!instanceName || !lead.followUpMessage) return;
    await agent.sendFollowUp(instanceName, lead.phoneNumber, lead.followUpMessage, lead.leadName);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const sendingMap: Record<string, boolean> = {};
  if (agent.analysisResult?.analysis) {
    for (const lead of agent.analysisResult.analysis) {
      sendingMap[lead.phoneNumber] = agent.isSending("", lead.phoneNumber);
    }
  }

  const sentMap: Record<string, boolean> = {};
  if (agent.analysisResult?.analysis) {
    for (const lead of agent.analysisResult.analysis) {
      sentMap[lead.phoneNumber] = agent.isSent("", lead.phoneNumber);
    }
  }

  return (
    <div className="space-y-8">
      {/* Provider Config */}
      <ProviderConfigSection
        config={agent.config}
        onSave={agent.saveConfig}
        onTest={agent.testConnection}
        onListModels={agent.listModels}
      />

      {/* Instance Selector */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Selecione as inst&acirc;ncias
          </h2>
          <p className="text-sm text-foreground-muted">
            Escolha uma ou mais inst&acirc;ncias WhatsApp para analisar as conversas.
          </p>
        </div>

        <InstanciaSelector
          instances={exporter.instances}
          selectedIds={exporter.selectedIds}
          onToggle={exporter.toggleInstancia}
          carregando={exporter.carregandoInstancias}
          erro={exporter.erroCarregamento}
        />
      </div>

      {/* Config & Analyze Button */}
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Configura&ccedil;&atilde;o da an&aacute;lise
          </h2>
          <p className="text-sm text-foreground-muted">
            Defina quantos chats e mensagens por chat deseja analisar.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <ExportConfigFields
            config={exporter.config}
            onUpdate={exporter.atualizarConfig}
            disabled={agent.analyzing}
          />

          <button
            onClick={handleAnalyze}
            disabled={exporter.selectedIds.length === 0 || agent.analyzing}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors h-9"
          >
            {agent.analyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {agent.batchProgress
                  ? `Analisando lote ${agent.batchProgress.current}/${agent.batchProgress.total}...`
                  : "Analisando..."}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Analisar com IA
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      <AnalysisReport
        result={agent.analysisResult}
        loading={agent.analyzing}
        error={agent.error}
        onSend={handleSend}
        onCopy={handleCopy}
        sendingMap={sendingMap}
        sentMap={sentMap}
        batchProgress={agent.batchProgress}
        warnings={agent.warnings}
      />
    </div>
  );
}

// Reusable config fields (inline component)
function ExportConfigFields({
  config,
  onUpdate,
  disabled,
}: {
  config: { chatLimit: number; messagesPerChat: number };
  onUpdate: (partial: Partial<{ chatLimit: number; messagesPerChat: number }>) => void;
  disabled: boolean;
}) {
  return (
    <>
      <div className="flex-1 space-y-1.5 min-w-[140px]">
        <label className="text-xs font-medium text-foreground-muted">
          Chats a analisar
        </label>
        <input
          type="number"
          min={1}
          max={1000}
          value={config.chatLimit}
          onChange={(e) =>
            onUpdate({ chatLimit: Math.max(1, Math.min(1000, Number(e.target.value) || 1)) })
          }
          disabled={disabled}
          className="flex h-9 w-full rounded-lg border border-border bg-background-surface px-3 py-1 text-sm text-foreground placeholder:text-foreground-muted disabled:opacity-50"
        />
      </div>
      <div className="flex-1 space-y-1.5 min-w-[140px]">
        <label className="text-xs font-medium text-foreground-muted">
          Mensagens por chat
        </label>
        <input
          type="number"
          min={1}
          max={100}
          value={config.messagesPerChat}
          onChange={(e) =>
            onUpdate({
              messagesPerChat: Math.max(1, Math.min(100, Number(e.target.value) || 1)),
            })
          }
          disabled={disabled}
          className="flex h-9 w-full rounded-lg border border-border bg-background-surface px-3 py-1 text-sm text-foreground placeholder:text-foreground-muted disabled:opacity-50"
        />
      </div>
    </>
  );
}
