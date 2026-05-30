"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Phone } from "lucide-react";
import { formataMoeda } from "@/lib/utils";
import type { Lead } from "../types";

type TransferenciaCardProps = {
  lead: Lead;
  onAceitar: (leadId: string) => Promise<void>;
  onRecusar: (leadId: string) => Promise<void>;
};

export function TransferenciaCard({ lead, onAceitar, onRecusar }: TransferenciaCardProps) {
  const [aceitando, setAceitando] = useState(false);
  const [recusando, setRecusando] = useState(false);
  const emAndamento = aceitando || recusando;

  const nomeRemetente =
    lead.transferencia_pendente?.funcionario_origem.nome ?? "Desconhecido";

  const handleAceitar = async () => {
    setAceitando(true);
    try {
      await onAceitar(lead.id);
    } finally {
      setAceitando(false);
    }
  };

  const handleRecusar = async () => {
    setRecusando(true);
    try {
      await onRecusar(lead.id);
    } finally {
      setRecusando(false);
    }
  };

  return (
    <Card className="rounded-2xl border border-info/40 bg-info/5 shadow-sm shadow-black/10">
      <CardContent className="p-3">
        <div className="mb-2 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-info/30 bg-info/10 px-2 py-0.5 text-[11px] font-medium text-foreground">
            De: {nomeRemetente}
          </span>
        </div>

        <h3 className="truncate text-sm font-semibold text-foreground">
          {lead.nome}
        </h3>

        <p className="mt-0.5 flex items-center gap-1 text-xs text-foreground-muted">
          <Phone className="h-3 w-3" />
          {lead.telefone}
        </p>

        {lead.valor_consorcio && (
          <p className="mt-2 text-lg font-bold text-success">
            {formataMoeda(lead.valor_consorcio)}
          </p>
        )}

        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            variant="default"
            className="h-8 flex-1 rounded-xl text-xs font-semibold"
            onClick={handleAceitar}
            disabled={emAndamento}
          >
            {aceitando ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : null}
            Aceitar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 flex-1 rounded-xl border border-border/70 text-xs"
            onClick={handleRecusar}
            disabled={emAndamento}
          >
            {recusando ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : null}
            Recusar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
