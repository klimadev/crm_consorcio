"use client";

import { Banknote, Building2, Megaphone, MessageCircle, PenLine, Phone, StickyNote, User, UserCog } from "lucide-react";
import { aplicaMascaraTelefoneBr } from "@/lib/utils";
import { cn } from "@/lib/utils";

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

type OrigemLead = "MANUAL" | "SINCRONIZACAO_WHATSAPP" | "ANUNCIO_CTWA";

type LeadDados = {
  id: string;
  nome: string;
  telefone: string;
  origem: OrigemLead;
  anuncio_titulo: string | null;
  anuncio_descricao: string | null;
  observacoes: string | null;
  valor_consorcio: number;
  estagio: { id: string; nome: string } | null;
  funcionario: { id: string; nome: string } | null;
  id_pdv: string | null;
  pdv: { id: string; nome: string } | null;
  gestores: Array<{ nome: string }> | null;
  parcelas: Array<{
    id: string;
    numero_parcela: number;
    valor: number;
    data_vencimento: string;
    status: string;
  }>;
};

type Props = {
  lead: LeadDados | null;
  carregando: boolean;
};

function getOrigemBadge(origem: OrigemLead) {
  switch (origem) {
    case "ANUNCIO_CTWA":
      return { bg: "bg-info/10", text: "text-info", icon: Megaphone, label: "Anúncio" };
    case "SINCRONIZACAO_WHATSAPP":
      return { bg: "bg-success/10", text: "text-success", icon: MessageCircle, label: "WhatsApp" };
    default:
      return { bg: "bg-warning/10", text: "text-warning", icon: PenLine, label: "Manual" };
  }
}

function InfoRow({ icone, label, valor }: { icone: React.ReactNode; label: string; valor: string }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5 text-foreground-muted">{icone}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wide text-foreground-muted">{label}</p>
        <p className="text-sm text-foreground">{valor}</p>
      </div>
    </div>
  );
}

export function ChatClientPanel({ lead, carregando }: Props) {
  if (process.env.NODE_ENV === "development") {
    console.log("[chat-client-panel]", { carregando, leadId: lead?.id ?? null });
  }

  const conteudo = carregando ? (
    <p className="text-sm text-foreground-muted">Carregando...</p>
  ) : !lead ? (
    <p className="text-sm text-foreground-muted">Selecione uma conversa</p>
  ) : null;

  if (conteudo) {
    return <div className="flex h-full items-center justify-center bg-background">{conteudo}</div>;
  }

  if (!lead) {
    return null;
  }

  const origemBadge = getOrigemBadge(lead.origem);
  const OrigemIcon = origemBadge.icon;

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-background">
      <div className="border-b border-border bg-background px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-lg font-semibold text-success">
            {lead.nome.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-foreground">{lead.nome}</p>
            <div className="mt-1 flex items-center gap-2">
              {lead.estagio && (
                <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                  {lead.estagio.nome}
                </span>
              )}
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", origemBadge.bg, origemBadge.text)}>
                <OrigemIcon className="h-3 w-3" />
                {origemBadge.label}
              </span>
            </div>
          </div>
        </div>

        {/* Info do anúncio se for origem de anúncio */}
        {lead.origem === "ANUNCIO_CTWA" && lead.anuncio_titulo && (
          <div className="mt-3 rounded-lg border border-info/25 bg-info/10 p-3">
            <div className="flex items-start gap-2">
              <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-info" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">{lead.anuncio_titulo}</p>
                {lead.anuncio_descricao && (
                  <p className="mt-1 text-xs text-foreground-muted">{lead.anuncio_descricao}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="divide-y divide-border px-4">
        <InfoRow
          icone={<Phone className="h-4 w-4" />}
          label="Telefone"
          valor={aplicaMascaraTelefoneBr(lead.telefone) || lead.telefone}
        />
        <InfoRow
          icone={<Banknote className="h-4 w-4" />}
          label="Valor do Consórcio"
          valor={formatarMoeda(lead.valor_consorcio)}
        />
        {lead.pdv && (
          <InfoRow
            icone={<Building2 className="h-4 w-4" />}
            label="PDV / Loja"
            valor={lead.pdv.nome}
          />
        )}
        {lead.gestores && lead.gestores.length > 0 && (
          <InfoRow
            icone={<UserCog className="h-4 w-4" />}
            label={lead.gestores.length > 1 ? "Gestores" : "Gestor"}
            valor={lead.gestores.map((g) => g.nome).join(", ")}
          />
        )}
        {lead.funcionario && (
          <InfoRow icone={<User className="h-4 w-4" />} label="Responsável" valor={lead.funcionario.nome} />
        )}
        {lead.observacoes && (
          <InfoRow icone={<StickyNote className="h-4 w-4" />} label="Observações" valor={lead.observacoes} />
        )}
      </div>

      {lead.parcelas.length > 0 && (
        <div className="border-t border-border px-4 py-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted">Parcelas</h3>
          <div className="space-y-1.5">
            {lead.parcelas.map((parcela) => (
              <div key={parcela.id} className="flex items-center justify-between rounded-lg bg-background-surface px-3 py-2 text-sm">
                <span className="text-foreground-muted">#{parcela.numero_parcela}</span>
                <span className="font-medium text-foreground">{formatarMoeda(parcela.valor)}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    parcela.status === "PAGO"
                      ? "bg-success/10 text-success"
                      : parcela.status === "VENCIDO"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-warning/10 text-warning"
                  }`}
                >
                  {parcela.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
