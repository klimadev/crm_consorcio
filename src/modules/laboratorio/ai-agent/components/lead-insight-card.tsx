"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Send,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  TrendingUp,
  Target,
  ThumbsDown,
  User,
  DollarSign,
} from "lucide-react";
import type { LeadAnalysis } from "../types";
import {
  PRIORIDADE_EMOJI,
  SENTIMENTO_CORES,
} from "../types";
import { FollowUpPreview } from "./follow-up-preview";

type Props = {
  lead: LeadAnalysis;
  onSend: (lead: LeadAnalysis) => Promise<void>;
  onCopy: (text: string) => void;
  sending: boolean;
  sent: boolean;
};

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(valor);
}

export function LeadInsightCard({ lead, onSend, onCopy, sending, sent }: Props) {
  const [copiado, setCopiado] = useState(false);

  const handleCopy = () => {
    if (lead.followUpMessage) {
      onCopy(lead.followUpMessage);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  const podeEnviar = !!lead.followUpMessage && lead.recommendedAction !== "SEM_ACAO";

  return (
    <div className="rounded-xl border border-border bg-background-surface p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{PRIORIDADE_EMOJI[lead.prioridade]}</span>
            <h3 className="text-sm font-semibold text-foreground truncate">
              {lead.leadName}
            </h3>
          </div>
          <p className="text-xs text-foreground-muted mt-0.5">
            {lead.phoneNumber} &middot; {lead.messageCount} mensagens
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {lead.sentiment && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{
                backgroundColor: `${SENTIMENTO_CORES[lead.sentiment]}15`,
                color: SENTIMENTO_CORES[lead.sentiment],
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: SENTIMENTO_CORES[lead.sentiment] }}
              />
              {lead.sentiment === "CALOR"
                ? "🔥 Calor"
                : lead.sentiment === "MORNO"
                  ? "⏳ Morno"
                  : lead.sentiment === "FRIO"
                    ? "❄️ Frio"
                    : "❓ Indefinido"}
            </span>
          )}
        </div>
      </div>

      {/* Valor da Carta Badge */}
      {lead.valorCarta && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 px-3 py-2">
          <DollarSign className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold text-emerald-400 tabular-nums">
            Carta estimada: {formatarMoeda(lead.valorCarta)}
          </span>
        </div>
      )}

      {/* Perfil e Interesse */}
      <div className="grid grid-cols-2 gap-3">
        {lead.perfil && (
          <div className="flex items-start gap-2">
            <User className="h-3.5 w-3.5 text-foreground-muted mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] text-foreground-disabled uppercase tracking-wider">Perfil</p>
              <p className="text-xs text-foreground">{lead.perfil}</p>
            </div>
          </div>
        )}
        {lead.interesse && (
          <div className="flex items-start gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-foreground-muted mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] text-foreground-disabled uppercase tracking-wider">Interesse</p>
              <p className="text-xs text-foreground">{lead.interesse}</p>
            </div>
          </div>
        )}
      </div>

      {/* Pain Points */}
      {lead.painPoints.length > 0 && (
        <div className="flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 text-foreground-muted mt-0.5 shrink-0" />
          <div>
            <p className="text-[11px] text-foreground-disabled uppercase tracking-wider">Dores</p>
            <div className="flex flex-wrap gap-1.5 mt-0.5">
              {lead.painPoints.map((p, i) => (
                <span
                  key={i}
                  className="inline-block rounded-md bg-rose-500/10 px-1.5 py-0.5 text-[11px] text-rose-400"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Buying Signals */}
      {lead.buyingSignals.length > 0 && (
        <div className="flex items-start gap-2">
          <Target className="h-3.5 w-3.5 text-foreground-muted mt-0.5 shrink-0" />
          <div>
            <p className="text-[11px] text-foreground-disabled uppercase tracking-wider">Sinais de Compra</p>
            <div className="flex flex-wrap gap-1.5 mt-0.5">
              {lead.buyingSignals.map((s, i) => (
                <span
                  key={i}
                  className="inline-block rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[11px] text-emerald-400"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Objeções */}
      {lead.objecoes.length > 0 && (
        <div className="flex items-start gap-2">
          <ThumbsDown className="h-3.5 w-3.5 text-foreground-muted mt-0.5 shrink-0" />
          <div>
            <p className="text-[11px] text-foreground-disabled uppercase tracking-wider">Objeções</p>
            <div className="flex flex-wrap gap-1.5 mt-0.5">
              {lead.objecoes.map((o, i) => (
                <span
                  key={i}
                  className="inline-block rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[11px] text-amber-400"
                >
                  {o}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Follow-up Preview */}
      <FollowUpPreview
        followUpMessage={lead.followUpMessage}
        leadName={lead.leadName}
        rationale={lead.rationale}
      />

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          variant="default"
          disabled={!podeEnviar || sending || sent}
          onClick={() => onSend(lead)}
          className="h-8 text-xs gap-1.5"
        >
          {sending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : sent ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          {sending ? "Enviando..." : sent ? "Enviado" : "Enviar WhatsApp"}
        </Button>

        {podeEnviar && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            className="h-8 text-xs gap-1.5"
          >
            {copiado ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copiado ? "Copiado" : "Copiar"}
          </Button>
        )}

        {!podeEnviar && (
          <span className="text-[11px] text-foreground-disabled" title="Lead frio sem follow-up sugerido">
            Lead frio sem follow-up sugerido
          </span>
        )}
      </div>
    </div>
  );
}
