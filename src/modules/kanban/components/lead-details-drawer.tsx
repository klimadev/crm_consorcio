"use client";

import { useState } from "react";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";
import {
  aplicaMascaraMoedaBr,
  aplicaMascaraTelefoneBr,
  converteMoedaBrParaNumero,
  normalizaTelefoneParaWhatsapp,
} from "@/lib/utils";
import type { Lead, PendenciaDinamica } from "../types";

const LABELS_PENDENCIA: Record<string, string> = {
  DOCUMENTO_APROVACAO_PENDENTE: "Documento de Aprovação (Pdf/Link) Pendente",
  ESTAGIO_PARADO: "Lead Parado no Estágio",
};

type LeadDetailsDrawerProps = {
  leadSelecionado: Lead | null;
  pendenciasLead: PendenciaDinamica[];
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
  onExcluirLead,
  onSalvarDetalhesLead,
}: LeadDetailsDrawerProps) {
  const [temAlteracoes, setTemAlteracoes] = useState(false);
  const [fecharConfirmado, setFecharConfirmado] = useState(false);
  const [confirmarExclusaoAberta, setConfirmarExclusaoAberta] = useState(false);

  const initialUrl = leadSelecionado?.documento_aprovacao_url ?? "";
  const urlEhAlterado = documentoAprovacaoUrl !== initialUrl;

  const hasChanges = temAlteracoes || urlEhAlterado;

  const handleOpenChange = async (aberto: boolean) => {
    if (!aberto && !fecharConfirmado && hasChanges) {
      const confirmar = window.confirm("Você tem alterações não salvas. Deseja descartar as alterações?");
      if (!confirmar) return;
      setFecharConfirmado(true);
    }
    if (aberto || (!hasChanges) || fecharConfirmado) {
      onOpenChange(false);
      setFecharConfirmado(false);
      setTemAlteracoes(false);
    }
  };

  const handleMudarLead = (leadAtualizado: Lead) => {
    onMudarLead(leadAtualizado);
    setTemAlteracoes(true);
  };

  const handleSalvar = async () => {
    if (leadSelecionado) {
      await onSalvarDetalhesLead(leadSelecionado, documentoAprovacaoUrl, {
        atualizarSelecionado: false,
      });
      setTemAlteracoes(false);
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
              {!salvando && !salvo && hasChanges && (
                <span className="flex items-center gap-1 text-amber-600">
                  <AlertCircle className="h-3 w-3" />
                  Alterações não salvas
                </span>
              )}
              {!salvando && !salvo && !hasChanges && "Detalhes do lead"}
            </span>
          </DrawerDescription>
        </DrawerHeader>

        {leadSelecionado ? (
          <div className="space-y-3 p-4 pb-6">
            <Input
              className="h-11 rounded-xl border-slate-200 bg-slate-50/80 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50"
              value={leadSelecionado.telefone}
              onChange={(e) =>
                handleMudarLead({
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
                handleMudarLead({
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
                handleMudarLead({
                  ...leadSelecionado,
                  observacoes: e.target.value,
                })
              }
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Documento de Aprovação (Pdf)
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
                    setTemAlteracoes(true);
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

            {pendenciasLead.some((p) => p.tipo === "DOCUMENTO_APROVACAO_PENDENTE") && (
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
                    className="flex items-center justify-between rounded-xl border border-rose-200/60 bg-rose-50/50 p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        {LABELS_PENDENCIA[pendencia.tipo] || pendencia.tipo}
                      </p>
                      <p className="text-xs text-slate-500">{pendencia.descricao}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {erroDetalhesLead ? <p className="text-sm font-medium text-rose-600">{erroDetalhesLead}</p> : null}

            {hasChanges && (
              <Button
                className="w-full rounded-xl text-sm font-medium"
                onClick={handleSalvar}
                disabled={salvando}
              >
                {salvando ? "Salvando..." : "Salvar Alterações"}
              </Button>
            )}

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
                onClick={() => setConfirmarExclusaoAberta(true)}
              >
                Excluir
              </Button>
            </div>

            <Dialog open={confirmarExclusaoAberta} onOpenChange={setConfirmarExclusaoAberta}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Excluir lead</DialogTitle>
                  <DialogDescription>
                    Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button type="button" variant="outline" onClick={() => setConfirmarExclusaoAberta(false)}>
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={async () => {
                      await onExcluirLead(leadSelecionado.id);
                      setConfirmarExclusaoAberta(false);
                    }}
                  >
                    Excluir
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
