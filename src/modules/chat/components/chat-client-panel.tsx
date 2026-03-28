"use client";

import { Banknote, Phone, StickyNote, User } from "lucide-react";
import { aplicaMascaraTelefoneBr } from "@/lib/utils";

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

type LeadDados = {
  id: string;
  nome: string;
  telefone: string;
  observacoes: string | null;
  valor_consorcio: number;
  estagio: { id: string; nome: string } | null;
  funcionario: { id: string; nome: string } | null;
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

function InfoRow({ icone, label, valor }: { icone: React.ReactNode; label: string; valor: string }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5 text-slate-400">{icone}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-sm text-slate-900">{valor}</p>
      </div>
    </div>
  );
}

export function ChatClientPanel({ lead, carregando }: Props) {
  if (process.env.NODE_ENV === "development") {
    console.log("[chat-client-panel]", { carregando, leadId: lead?.id ?? null });
  }

  const conteudo = carregando ? (
    <p className="text-sm text-slate-400">Carregando...</p>
  ) : !lead ? (
    <p className="text-sm text-slate-400">Selecione uma conversa</p>
  ) : null;

  if (conteudo) {
    return <div className="flex h-full items-center justify-center bg-slate-50">{conteudo}</div>;
  }

  if (!lead) {
    return null;
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-slate-50">
      <div className="border-b border-slate-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-lg font-semibold text-emerald-700">
            {lead.nome.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{lead.nome}</p>
            {lead.estagio && (
              <span className="mt-0.5 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                {lead.estagio.nome}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-100 px-4">
        <InfoRow
          icone={<Phone className="h-4 w-4" />}
          label="Telefone"
          valor={aplicaMascaraTelefoneBr(lead.telefone) || lead.telefone}
        />
        <InfoRow
          icone={<Banknote className="h-4 w-4" />}
          label="Valor do Consorcio"
          valor={formatarMoeda(lead.valor_consorcio)}
        />
        {lead.funcionario && (
          <InfoRow icone={<User className="h-4 w-4" />} label="Responsavel" valor={lead.funcionario.nome} />
        )}
        {lead.observacoes && (
          <InfoRow icone={<StickyNote className="h-4 w-4" />} label="Observacoes" valor={lead.observacoes} />
        )}
      </div>

      {lead.parcelas.length > 0 && (
        <div className="border-t border-slate-200 p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Parcelas</h3>
          <div className="space-y-1.5">
            {lead.parcelas.map((parcela) => (
              <div key={parcela.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
                <span className="text-slate-600">#{parcela.numero_parcela}</span>
                <span className="font-medium text-slate-900">{formatarMoeda(parcela.valor)}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    parcela.status === "PAGO"
                      ? "bg-emerald-100 text-emerald-700"
                      : parcela.status === "VENCIDO"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-amber-100 text-amber-700"
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
