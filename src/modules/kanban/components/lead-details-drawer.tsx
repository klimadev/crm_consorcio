"use client";

import { useEffect } from "react";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  aplicaMascaraMoedaBr,
  aplicaMascaraTelefoneBr,
  converteMoedaBrParaNumero,
  normalizaTelefoneParaWhatsapp,
} from "@/lib/utils";
import { LABELS_PENDENCIA, TipoPendencia } from "@/lib/validacoes";
import type { Lead, PendenciaLead } from "../types";

type LeadDetailsDrawerProps = {
  leadSelecionado: Lead | null;
  pendenciasLead: PendenciaLead[];
  onOpenChange: (aberto: boolean) => void;
  onMudarLead: (leadAtualizado: Lead) => void;
  documentoAprovacaoUrl: string;
  setDocumentoAprovacaoUrl: (url: string) => void;
  arquivoSelecionado: File | null;
  setArquivoSelecionado: (file: File | null) => void;
  uploadando: boolean;
  salvando: boolean;
  salvo: boolean;
  erroDetalhesLead: string | null;
  setErroDetalhesLead: (erro: string | null) => void;
  onTogglePendenciaResolvida: (pendencia: PendenciaLead) => Promise<void>;
  onExcluirLead: (id: string) => Promise<void>;
  onSalvarDetalhesLead: (lead: Lead, urlDocumento?: string, opcoes?: { atualizarSelecionado?: boolean }) => Promise<void>;
};

export function LeadDetailsDrawer({
  leadSelecionado,
  pendenciasLead,
  onOpenChange,
  onMudarLead,
  documentoAprovacaoUrl,
  setDocumentoAprovacaoUrl,
  arquivoSelecionado,
  setArquivoSelecionado,
  uploadando,
  salvando,
  salvo,
  erroDetalhesLead,
  setErroDetalhesLead,
  onTogglePendenciaResolvida,
  onExcluirLead,
  onSalvarDetalhesLead,
}: LeadDetailsDrawerProps) {
  useEffect(() => {
    if (leadSelecionado) {
      setDocumentoAprovacaoUrl(leadSelecionado.documento_aprovacao_url ?? "");
    }
  }, [leadSelecionado?.id, setDocumentoAprovacaoUrl]);

  const handleOpenChange = (aberto: boolean) => {
    if (!aberto) {
      if (leadSelecionado) {
        onSalvarDetalhesLead(leadSelecionado, documentoAprovacaoUrl, {
          atualizarSelecionado: false,
        });
      }
      onOpenChange(false);
    }
  };

  return (
    <Drawer open={Boolean(leadSelecionado)} onOpenChange={handleOpenChange}>
      <DrawerContent className="mx-auto w-full max-w-xl">
        <DrawerHeader>
          <DrawerTitle>{leadSelecionado?.nome}</DrawerTitle>
          <DrawerDescription>
            <span className="flex items-center gap-2">
              {salvando && <span className="text-amber-600">Salvando...</span>}
              {salvo && !salvando && <span className="text-green-600">Salvo ✓</span>}
              {!salvando && !salvo && "Detalhes do lead"}
            </span>
          </DrawerDescription>
        </DrawerHeader>

        {leadSelecionado ? (
          <div className="space-y-3 p-4 pb-6">
            <Input
              className="h-11 rounded-xl border-slate-200 bg-slate-50/80 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50"
              value={leadSelecionado.telefone}
              onChange={(e) =>
                onMudarLead({
                  ...leadSelecionado,
                  telefone: aplicaMascaraTelefoneBr(e.target.value),
                })
              }
            />
            <Input
              className="h-11 rounded-xl border-slate-200 bg-slate-50/80 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50"
              inputMode="numeric"
              value={aplicaMascaraMoedaBr(String(Math.round(leadSelecionado.valor_consorcio * 100)))}
              onChange={(e) =>
                onMudarLead({
                  ...leadSelecionado,
                  valor_consorcio: converteMoedaBrParaNumero(e.target.value),
                })
              }
            />
            <Textarea
              className="rounded-xl border-slate-200 bg-slate-50/80 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50 min-h-[80px]"
              placeholder="Observações..."
              value={leadSelecionado.observacoes ?? ""}
              onChange={(e) =>
                onMudarLead({
                  ...leadSelecionado,
                  observacoes: e.target.value,
                })
              }
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Documento de Aprovação (PDF)
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="application/pdf"
                  id="documento-upload"
                  className="block w-full text-sm text-slate-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-medium
                    file:bg-sky-50 file:text-sky-700
                    hover:file:bg-sky-100
                  "
                  onChange={(e) => {
                    const arquivo = e.target.files?.[0];
                    if (arquivo) {
                      if (arquivo.type !== "application/pdf") {
                        return;
                      }
                      if (arquivo.size > 10 * 1024 * 1024) {
                        return;
                      }
                      setArquivoSelecionado(arquivo);
                      setErroDetalhesLead(null);
                      setTimeout(() => onSalvarDetalhesLead(leadSelecionado), 100);
                    }
                  }}
                />
              </div>
              {arquivoSelecionado && (
                <p className="text-sm text-sky-600">
                  Arquivo selecionado: {arquivoSelecionado.name}
                </p>
              )}

              <div className="relative">
                <p className="mb-1 text-xs font-medium text-slate-500">Ou cole uma URL:</p>
                <Input
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50"
                  placeholder="URL do documento (Google Drive, etc)"
                  value={documentoAprovacaoUrl}
                  onChange={(e) => {
                    setDocumentoAprovacaoUrl(e.target.value);
                    if (e.target.value) setArquivoSelecionado(null);
                  }}
                />
              </div>

              {leadSelecionado?.documento_aprovacao_url && (
                <a
                  href={leadSelecionado.documento_aprovacao_url}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-sm font-medium text-sky-600 hover:underline"
                >
                  Ver documento atual
                </a>
              )}

              <p className="text-xs text-slate-500">
                O documento de aprovação é opcional, mas sua ausência gera uma pendência.
              </p>
            </div>

            {pendenciasLead.some((p) => p.tipo === "DOCUMENTO_APROVACAO_PENDENTE" && !p.resolvida) && (
              <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 p-3 text-sm text-amber-800 shadow-sm">
                <p className="font-semibold">Pendencia: Documento de Aprovacao</p>
                <p className="mt-1 text-xs">Este lead nao possui documento de aprovacao anexado.</p>
              </div>
            )}

            {leadSelecionado.motivo_perda ? (
              <div className="rounded-xl border border-rose-200/60 bg-rose-50/50 p-3 text-sm text-rose-700 shadow-sm">
                <p className="font-semibold">Motivo da perda:</p>
                <p className="mt-1 text-xs">{leadSelecionado.motivo_perda}</p>
              </div>
            ) : null}

            {pendenciasLead.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700">Pendencias</p>
                {pendenciasLead.map((pendencia) => (
                  <div
                    key={pendencia.id}
                    className={`flex items-center justify-between rounded-xl border p-3 ${
                      pendencia.resolvida ? "border-emerald-200/60 bg-emerald-50/50" : "border-rose-200/60 bg-rose-50/50"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        {LABELS_PENDENCIA[pendencia.tipo as TipoPendencia] || pendencia.tipo}
                      </p>
                      <p className="text-xs text-slate-500">{pendencia.descricao}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={pendencia.resolvida}
                      onChange={() => onTogglePendenciaResolvida(pendencia)}
                      className="h-5 w-5 rounded border-slate-300 text-slate-600 focus:ring-slate-400 focus:ring-offset-2"
                    />
                  </div>
                ))}
              </div>
            )}

            {erroDetalhesLead ? <p className="text-sm font-medium text-rose-600">{erroDetalhesLead}</p> : null}

            <div className="flex gap-2">
              <Button
                variant="outline"
                asChild
                className="flex-1 rounded-xl border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              >
                <a
                  href={`https://wa.me/${normalizaTelefoneParaWhatsapp(leadSelecionado.telefone)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
              </Button>
              <Button
                variant="destructive"
                className="rounded-xl text-sm font-medium"
                onClick={async () => {
                  if (!confirm("Tem certeza que deseja excluir este lead?")) return;
                  await onExcluirLead(leadSelecionado.id);
                }}
              >
                Excluir
              </Button>
            </div>
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
