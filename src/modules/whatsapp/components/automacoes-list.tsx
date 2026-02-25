"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Trash2, Loader2, Zap, Check, X, Plus, Clock3, ArrowRight, Send, XCircle, CheckCircle2, AlertCircle } from "lucide-react";
import { criarContextoPreviewWhatsapp, renderizarTemplateWhatsapp } from "@/lib/whatsapp-template";
import { parseHorarioTexto } from "@/lib/parse-horario-texto";
import type {
  WhatsappInstancia,
  WhatsappAutomacao,
  EstagioFunilOption,
  WhatsappAutomacaoCreateInput,
  WhatsappFollowUpDispatchResultado,
} from "../types";

type EtapaForm = {
  ordem: number;
  delay_horas: number;
  delay_minutos: number;
  delay_texto: string;
  mensagem_template: string;
};

function delayToTexto(horas: number, minutos: number): string {
  if (horas === 0) return minutos === 1 ? "1m" : `${minutos}min`;
  if (minutos === 0) return horas === 1 ? "1h" : `${horas}h`;
  return `${horas}h${minutos}`;
}

function textoToDelay(texto: string): { horas: number; minutos: number } {
  const resultado = parseHorarioTexto(texto);
  if (resultado.ok) {
    return { horas: Math.floor(resultado.delay_minutos / 60), minutos: resultado.delay_minutos % 60 };
  }
  return { horas: 1, minutos: 0 };
}

const VARIAVEIS = [
  "{{lead_nome}}",
  "{{lead_telefone}}",
  "{{lead_id}}",
  "{{estagio_anterior}}",
  "{{estagio_novo}}",
] as const;

import type { WhatsappAutomacaoUpdateInput } from "../types";

type Props = {
  automacoes: WhatsappAutomacao[];
  instancias: WhatsappInstancia[];
  carregando: boolean;
  erro: string | null;
  onCriar: (data: WhatsappAutomacaoCreateInput) => Promise<void>;
  onAtualizar: (id: string, data: WhatsappAutomacaoUpdateInput) => Promise<void>;
  onPreview: (mensagem: string) => Promise<string | null>;
  onDispararDispatch: (limite?: number) => Promise<WhatsappFollowUpDispatchResultado | null>;
  onAlternar: (id: string, ativo: boolean) => Promise<void>;
  onExcluir: (id: string) => Promise<void>;
};

// Flow item component - shows trigger -> action visually
function AutomationFlowItem({ 
  automacao, 
  instanciaNome, 
  onToggle, 
  onEdit,
  onRequestDelete,
}: { 
  automacao: WhatsappAutomacao;
  instanciaNome: string;
  onToggle: (id: string, ativo: boolean) => void;
  onEdit: (automacao: WhatsappAutomacao) => void;
  onRequestDelete: (id: string) => void;
}) {
  const isFollowUp = automacao.evento === "LEAD_FOLLOW_UP";
  const isError = automacao.status === "ERRO_CONFIG" || automacao.status === "ERRO_JOB";
  
  return (
    <Card className={`group overflow-hidden rounded-xl border transition-all hover:shadow-md ${
      isError ? "border-rose-200/60 bg-rose-50/30" : "border-slate-200/60 bg-white hover:border-slate-300/60"
    }`}>
      <CardContent className="p-0">
        <div className="flex items-center gap-0">
          {/* Trigger Block */}
          <div className="flex-1 bg-gradient-to-r from-slate-50 to-white p-4 border-r border-slate-100">
            <div className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                isFollowUp ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
              }`}>
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {isFollowUp ? "Follow-up Timeline" : "Mudança de Estágio"}
                </p>
                <p className="text-xs text-slate-500">
                  {instanciaNome}
                </p>
              </div>
            </div>
          </div>

          {/* Arrow Connector */}
          <div className="flex h-12 w-12 items-center justify-center bg-slate-50">
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </div>

          {/* Action Block */}
          <div className="flex-1 bg-gradient-to-r from-white to-slate-50 p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                {isFollowUp ? (
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium text-slate-700">
                      {automacao.etapas?.length ?? 0} etapa{automacao.etapas?.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                ) : (
                  <p className="truncate text-sm text-slate-600 max-w-[200px]">
                    {automacao.mensagem || "Sem mensagem"}
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-400">
                  {automacao.tipo_destino === "FIXO" ? automacao.telefone_destino : "Telefone do lead"}
                </p>
              </div>
              
              {/* Status Chip */}
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border shrink-0 ${
                automacao.status === "ATIVA" && automacao.ativo
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                  : automacao.status === "ERRO_CONFIG" || automacao.status === "ERRO_JOB"
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-slate-100 text-slate-500 border-slate-200"
              }`}>
                {automacao.status === "ATIVA" && automacao.ativo ? (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Ativo
                  </>
                ) : automacao.status === "ERRO_CONFIG" ? (
                  <>
                    <AlertCircle className="h-3 w-3" />
                    Erro Config
                  </>
                ) : automacao.status === "ERRO_JOB" ? (
                  <>
                    <AlertCircle className="h-3 w-3" />
                    Erro Job
                  </>
                ) : (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    Inativo
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 border-l border-slate-100 bg-slate-50/50 px-2">
            <button
              type="button"
              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                automacao.ativo
                  ? "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                  : "border-slate-200 bg-white text-slate-400 hover:bg-slate-100"
              }`}
              onClick={() => onToggle(automacao.id, !automacao.ativo)}
              title={automacao.ativo ? "Desativar" : "Ativar"}
            >
              {automacao.ativo ? (
                <Check className="h-4 w-4" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-blue-600"
              onClick={() => onEdit(automacao)}
              title="Editar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                <path d="m15 5 4 4"/>
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-rose-600"
              onClick={() => onRequestDelete(automacao.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Dispatch Progress Overlay
function DispatchOverlay({ 
  open, 
  resultado, 
  onClose 
}: { 
  open: boolean;
  resultado: WhatsappFollowUpDispatchResultado | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {resultado ? (
              resultado.falhas === 0 ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />
              )
            ) : (
              <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
            )}
            Processamento de Follow-ups
          </DialogTitle>
          <DialogDescription>
            {resultado ? "Concluído" : "Processando mensagens..."}
          </DialogDescription>
        </DialogHeader>

        {resultado && (
          <div className="space-y-4 py-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-emerald-50 p-3 text-center">
                <p className="text-2xl font-bold text-emerald-600">{resultado.enviados}</p>
                <p className="text-xs text-emerald-700">Enviados</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{resultado.falhas}</p>
                <p className="text-xs text-amber-700">Falhas</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-center">
                <p className="text-2xl font-bold text-slate-600">{resultado.processados}</p>
                <p className="text-xs text-slate-600">Processados</p>
              </div>
            </div>

            {/* Metrics if available */}
            {resultado.metrics && (
              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
                <p><strong>Metrics:</strong></p>
                <p>Claimed: {resultado.metrics.jobsClaimed}</p>
                <p>Skipped (already claimed): {resultado.metrics.jobsSkippedAlreadyClaimed}</p>
                <p>Duplicates blocked: {resultado.metrics.jobsDuplicateBlocked}</p>
              </div>
            )}

            {/* Details */}
            {resultado.detalhes.length > 0 && (
              <div className="max-h-32 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
                {resultado.detalhes.slice(0, 10).map((detalhe, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs py-1">
                    {detalhe.statusFinal === "ENVIADO" ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    ) : detalhe.statusFinal === "FALHA" ? (
                      <XCircle className="h-3 w-3 text-rose-500" />
                    ) : (
                      <Loader2 className="h-3 w-3 text-amber-500 animate-spin" />
                    )}
                    <span className="truncate flex-1">{detalhe.leadId}</span>
                    <span className="text-slate-400">{detalhe.statusFinal}</span>
                  </div>
                ))}
              </div>
            )}

            {resultado.runId && (
              <p className="text-xs text-slate-400 text-center">
                Run ID: {resultado.runId}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose} className="w-full">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AutomacoesList({
  automacoes,
  instancias,
  carregando,
  erro,
  onCriar,
  onAtualizar,
  onPreview,
  onDispararDispatch,
  onAlternar,
  onExcluir,
}: Props) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editAutomacaoId, setEditAutomacaoId] = useState<string | null>(null);
  const [showDispatchResult, setShowDispatchResult] = useState(false);
  const [dispatchExecutando, setDispatchExecutando] = useState(false);
  const [dispatchResultado, setDispatchResultado] = useState<WhatsappFollowUpDispatchResultado | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [estagios, setEstagios] = useState<EstagioFunilOption[]>([]);

  // Form state
  const [enviando, setEnviando] = useState(false);
  const [formErro, setFormErro] = useState<string | null>(null);
  const [previewServidor, setPreviewServidor] = useState<string | null>(null);
  const [instanciaId, setInstanciaId] = useState("");
  const [evento, setEvento] = useState<"LEAD_STAGE_CHANGED" | "LEAD_FOLLOW_UP">("LEAD_STAGE_CHANGED");
  const [tipoDestino, setTipoDestino] = useState<"FIXO" | "LEAD_TELEFONE">("LEAD_TELEFONE");
  const [idEstagioDestino, setIdEstagioDestino] = useState("");
  const [telefone, setTelefone] = useState("");
  const [mensagemPrincipal, setMensagemPrincipal] = useState("");
  const [etapas, setEtapas] = useState<EtapaForm[]>([
    { ordem: 1, delay_horas: 1, delay_minutos: 0, delay_texto: "1h", mensagem_template: "" },
  ]);

  const instanciaPorId = new Map(instancias.map((i) => [i.id, i]));

  // Função para abrir dialog de edição com dados da automação
  const openEditDialog = (automacao: WhatsappAutomacao) => {
    setEditAutomacaoId(automacao.id);
    setInstanciaId(automacao.id_whatsapp_instancia);
    setEvento(automacao.evento);
    setTipoDestino(automacao.tipo_destino);
    setIdEstagioDestino(automacao.id_estagio_destino || "");
    setTelefone(automacao.telefone_destino || "");
    setMensagemPrincipal(automacao.mensagem || "");
    
    // Converter etapas do formato banco para formato formulário
    if (automacao.etapas && automacao.etapas.length > 0) {
      setEtapas(automacao.etapas.map(etapa => ({
        ordem: etapa.ordem,
        delay_horas: Math.floor(etapa.delay_minutos / 60),
        delay_minutos: etapa.delay_minutos % 60,
        delay_texto: delayToTexto(Math.floor(etapa.delay_minutos / 60), etapa.delay_minutos % 60),
        mensagem_template: etapa.mensagem_template,
      })));
    } else {
      setEtapas([{ ordem: 1, delay_horas: 1, delay_minutos: 0, delay_texto: "1h", mensagem_template: "" }]);
    }
    
    setShowEditDialog(true);
  };

  // Load stages
  useEffect(() => {
    let ativo = true;
    const carregarEstagios = async () => {
      const resposta = await fetch("/api/estagios");
      const json = await resposta.json().catch(() => ({}));
      if (!resposta.ok || !ativo) return;
      setEstagios(Array.isArray(json.estagios) ? json.estagios : []);
    };
    void carregarEstagios();
    return () => { ativo = false; };
  }, []);

  const limparFeedback = () => {
    setPreviewServidor(null);
    setFormErro(null);
  };

  const contextoPreview = useMemo(
    () => criarContextoPreviewWhatsapp({
      estagio_novo: estagios.find((item) => item.id === idEstagioDestino)?.nome ?? "FollowUp",
    }),
    [estagios, idEstagioDestino],
  );

  const previewLocalPrincipal = renderizarTemplateWhatsapp(mensagemPrincipal, contextoPreview);

  const resetForm = () => {
    setInstanciaId("");
    setEvento("LEAD_STAGE_CHANGED");
    setTipoDestino("LEAD_TELEFONE");
    setIdEstagioDestino("");
    setTelefone("");
    setMensagemPrincipal("");
    setEtapas([{ ordem: 1, delay_horas: 1, delay_minutos: 0, delay_texto: "1h", mensagem_template: "" }]);
    setFormErro(null);
    setPreviewServidor(null);
  };

  const resetEditForm = () => {
    setEditAutomacaoId(null);
    resetForm();
    setShowEditDialog(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instanciaId) return;
    if (tipoDestino === "FIXO" && !telefone.trim()) {
      setFormErro("Informe o número de destino.");
      return;
    }
    if (evento === "LEAD_STAGE_CHANGED" && !mensagemPrincipal.trim()) {
      setFormErro("Mensagem obrigatória para automação imediata.");
      return;
    }
    if (evento === "LEAD_FOLLOW_UP" && etapas.some((etapa) => !etapa.mensagem_template.trim())) {
      setFormErro("Preencha todas as mensagens da timeline.");
      return;
    }

    setEnviando(true);
    setFormErro(null);

    const payload: WhatsappAutomacaoCreateInput = {
      id_whatsapp_instancia: instanciaId,
      evento,
      tipo_destino: tipoDestino,
      id_estagio_destino: idEstagioDestino || undefined,
      telefone_destino: tipoDestino === "FIXO" ? telefone : undefined,
      mensagem: evento === "LEAD_STAGE_CHANGED" ? mensagemPrincipal : undefined,
      etapas: evento === "LEAD_FOLLOW_UP"
        ? etapas.map((etapa, index) => ({
            ordem: index + 1,
            delay_minutos: Math.max(1, (etapa.delay_horas * 60) + etapa.delay_minutos),
            mensagem_template: etapa.mensagem_template,
          }))
        : undefined,
    };

    await onCriar(payload);

    setEnviando(false);
    setShowCreateDialog(false);
    resetForm();
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAutomacaoId || !instanciaId) return;
    if (tipoDestino === "FIXO" && !telefone.trim()) {
      setFormErro("Informe o número de destino.");
      return;
    }
    if (evento === "LEAD_STAGE_CHANGED" && !mensagemPrincipal.trim()) {
      setFormErro("Mensagem obrigatória para automação imediata.");
      return;
    }
    if (evento === "LEAD_FOLLOW_UP" && etapas.some((etapa) => !etapa.mensagem_template.trim())) {
      setFormErro("Preencha todas as mensagens da timeline.");
      return;
    }

    setEnviando(true);
    setFormErro(null);

    const payload: WhatsappAutomacaoUpdateInput = {
      id_whatsapp_instancia: instanciaId,
      evento,
      tipo_destino: tipoDestino,
      id_estagio_destino: idEstagioDestino || null,
      telefone_destino: tipoDestino === "FIXO" ? telefone : null,
      mensagem: evento === "LEAD_STAGE_CHANGED" ? mensagemPrincipal : null,
      etapas: evento === "LEAD_FOLLOW_UP"
        ? etapas.map((etapa, index) => ({
            ordem: index + 1,
            delay_minutos: Math.max(1, (etapa.delay_horas * 60) + etapa.delay_minutos),
            mensagem_template: etapa.mensagem_template,
          }))
        : undefined,
    };

    await onAtualizar(editAutomacaoId, payload);

    setEnviando(false);
    resetEditForm();
  };

  const adicionarEtapa = () => {
    limparFeedback();
    setEtapas((atual) => [
      ...atual,
      { ordem: atual.length + 1, delay_horas: 1, delay_minutos: 0, delay_texto: "1h", mensagem_template: "" },
    ]);
  };

  const atualizarEtapa = (index: number, dados: Partial<EtapaForm>) => {
    limparFeedback();
    setEtapas((atual) => atual.map((item, i) => (i === index ? { ...item, ...dados } : item)));
  };

  const removerEtapa = (index: number) => {
    limparFeedback();
    setEtapas((atual) => {
      if (atual.length <= 1) return atual;
      return atual.filter((_, i) => i !== index).map((item, i) => ({ ...item, ordem: i + 1 }));
    });
  };

  const inserirVariavel = (variavel: string) => {
    limparFeedback();
    if (evento === "LEAD_STAGE_CHANGED") {
      setMensagemPrincipal((atual) => `${atual}${variavel}`);
    } else {
      setEtapas((atual) => {
        if (!atual.length) return atual;
        return atual.map((item, index) =>
          index === atual.length - 1
            ? { ...item, mensagem_template: `${item.mensagem_template}${variavel}` }
            : item
        );
      });
    }
  };

  const gerarPreviewServidor = async () => {
    if (evento !== "LEAD_STAGE_CHANGED" || !mensagemPrincipal.trim()) return;
    const preview = await onPreview(mensagemPrincipal);
    setPreviewServidor(preview);
  };

  const disparaDispatch = async () => {
    setDispatchExecutando(true);
    setShowDispatchResult(true);
    const resultado = await onDispararDispatch(50);
    setDispatchResultado(resultado);
    setDispatchExecutando(false);
  };

  const getNomeInstancia = (id: string) => {
    const inst = instanciaPorId.get(id);
    return inst?.nome ?? "Instância";
  };

  if (carregando) {
    return (
      <Card className="rounded-2xl border border-slate-200/60 bg-white">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Command Bar */}
      <Card className="rounded-2xl border border-slate-200/60 bg-white">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
              <Zap className="h-4 w-4 text-amber-500" />
              Automações de Notificação
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-xl border-slate-200 text-sm font-medium"
                onClick={disparaDispatch}
                disabled={dispatchExecutando}
              >
                {dispatchExecutando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Processar Follow-ups
              </Button>
              <Button
                variant="default"
                size="sm"
                className="h-9 rounded-xl bg-emerald-600 text-sm font-medium hover:bg-emerald-700"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nova Automação
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Empty State */}
      {automacoes.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <Zap className="h-7 w-7 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-700">
            Nenhuma automação configurada
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Configure alertas automáticos para receber notificações no WhatsApp
          </p>
          <Button
            variant="default"
            size="sm"
            className="mt-4 rounded-xl bg-emerald-600 hover:bg-emerald-700"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Criar primeira automação
          </Button>
        </div>
      )}

      {/* Automation Flow List */}
      <div className="space-y-3">
        {automacoes.map((automacao) => (
          <AutomationFlowItem
            key={automacao.id}
            automacao={automacao}
            instanciaNome={getNomeInstancia(automacao.id_whatsapp_instancia)}
            onToggle={onAlternar}
            onEdit={openEditDialog}
            onRequestDelete={(id) => setDeleteConfirmId(id)}
          />
        ))}
      </div>

      {/* Create Automation Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Nova Automação</DialogTitle>
            <DialogDescription>
              Configure uma automação de notificação WhatsApp
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formErro && (
              <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600 border border-rose-200">
                {formErro}
              </div>
            )}
            {erro && (
              <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600 border border-rose-200">
                {erro}
              </div>
            )}

            <div className="grid gap-4">
              {/* Instance Selection */}
              <div>
                <label className="text-sm font-medium text-slate-700">Instância WhatsApp</label>
                <select
                  className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  value={instanciaId}
                  onChange={(e) => setInstanciaId(e.target.value)}
                  required
                >
                  <option value="">Selecione...</option>
                  {instancias.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.nome} {inst.phone ? `(${inst.phone})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Event Type */}
              <div>
                <label className="text-sm font-medium text-slate-700">Tipo de Evento</label>
                <select
                  className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  value={evento}
                  onChange={(e) => {
                    limparFeedback();
                    setEvento(e.target.value as "LEAD_STAGE_CHANGED" | "LEAD_FOLLOW_UP");
                  }}
                >
                  <option value="LEAD_STAGE_CHANGED">Mudança de estágio (mensagem imediata)</option>
                  <option value="LEAD_FOLLOW_UP">Follow-up por timeline (mensagens agendadas)</option>
                </select>
              </div>

              {/* Stage Filter (optional) */}
              <div>
                <label className="text-sm font-medium text-slate-700">Filtrar por estágio (opcional)</label>
                <select
                  className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  value={idEstagioDestino}
                  onChange={(e) => {
                    limparFeedback();
                    setIdEstagioDestino(e.target.value);
                  }}
                >
                  <option value="">Todos os estágios</option>
                  {estagios.map((estagio) => (
                    <option key={estagio.id} value={estagio.id}>
                      {estagio.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Type */}
              <div>
                <label className="text-sm font-medium text-slate-700">Destino da Mensagem</label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={`rounded-lg border px-4 py-3 text-sm font-medium transition-all ${
                      tipoDestino === "LEAD_TELEFONE"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                    onClick={() => {
                      limparFeedback();
                      setTipoDestino("LEAD_TELEFONE");
                    }}
                  >
                    📱 Telefone do lead
                  </button>
                  <button
                    type="button"
                    className={`rounded-lg border px-4 py-3 text-sm font-medium transition-all ${
                      tipoDestino === "FIXO"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                    onClick={() => {
                      limparFeedback();
                      setTipoDestino("FIXO");
                    }}
                  >
                    📞 Número específico
                  </button>
                </div>
              </div>

              {/* Fixed Phone Number */}
              {tipoDestino === "FIXO" && (
                <div>
                  <label className="text-sm font-medium text-slate-700">Número de destino</label>
                  <Input
                    className="mt-1.5"
                    placeholder="+55 (11) 99999-9999"
                    value={telefone}
                    onChange={(e) => {
                      limparFeedback();
                      setTelefone(e.target.value);
                    }}
                    required={tipoDestino === "FIXO"}
                  />
                </div>
              )}

              {/* Variables */}
              <div>
                <label className="text-sm font-medium text-slate-700">Variáveis disponíveis</label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {VARIAVEIS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 transition-colors"
                      onClick={() => inserirVariavel(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message for Immediate */}
              {evento === "LEAD_STAGE_CHANGED" && (
                <div>
                  <label className="text-sm font-medium text-slate-700">Mensagem</label>
                  <Textarea
                    className="mt-1.5 min-h-[100px]"
                    placeholder="Ex: Novo lead {{lead_nome}} mudou para {{estagio_novo}}"
                    value={mensagemPrincipal}
                    onChange={(e) => {
                      limparFeedback();
                      setMensagemPrincipal(e.target.value);
                    }}
                    required={evento === "LEAD_STAGE_CHANGED"}
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      Prévia: <span className="text-slate-700">{previewLocalPrincipal || "..."}</span>
                    </p>
                    <Button type="button" size="sm" variant="outline" onClick={gerarPreviewServidor}>
                      Preview Servidor
                    </Button>
                  </div>
                </div>
              )}

              {/* Timeline for Follow-up */}
              {evento === "LEAD_FOLLOW_UP" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">Timeline de Follow-up</label>
                    <Button type="button" variant="outline" size="sm" onClick={adicionarEtapa}>
                      <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar etapa
                    </Button>
                  </div>
                  {etapas.map((etapa, index) => (
                    <div key={index} className="rounded-lg border border-slate-200 p-4 bg-slate-50/50">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-slate-700">Etapa {index + 1}</p>
                        <button
                          type="button"
                          className="text-xs text-rose-600 hover:text-rose-700 disabled:text-slate-300"
                          onClick={() => removerEtapa(index)}
                          disabled={etapas.length <= 1}
                        >
                          Remover
                        </button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="text-xs text-slate-500">Enviar após o trigger</label>
                          <div className="mt-1 flex items-center gap-2">
                            <Input
                              className="h-9 w-24 font-mono"
                              placeholder="9h, 30min, 2h30"
                              value={etapa.delay_texto}
                              onChange={(e) => {
                                const texto = e.target.value;
                                const { horas, minutos } = textoToDelay(texto);
                                atualizarEtapa(index, {
                                  delay_texto: texto,
                                  delay_horas: horas,
                                  delay_minutos: minutos,
                                });
                              }}
                            />
                            <span className="text-xs text-emerald-600 font-medium min-w-[60px]">
                              {etapa.delay_horas > 0 || etapa.delay_minutos > 0 
                                ? (etapa.delay_horas === 0 ? `${etapa.delay_minutos}min` 
                                  : etapa.delay_minutos === 0 ? `${etapa.delay_horas}h`
                                  : `${etapa.delay_horas}h ${etapa.delay_minutos}min`)
                                : ""}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Exemplos: 9h, 30min, 2h30, 1m
                          </p>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">Prévia</label>
                          <p className="mt-1 text-xs text-slate-600 truncate">
                            {renderizarTemplateWhatsapp(etapa.mensagem_template, contextoPreview) || "..."}
                          </p>
                        </div>
                      </div>

                      <Textarea
                        className="mt-3 min-h-[80px]"
                        placeholder="Mensagem desta etapa..."
                        value={etapa.mensagem_template}
                        onChange={(e) => {
                          atualizarEtapa(index, { mensagem_template: e.target.value });
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={
                  enviando ||
                  !instanciaId ||
                  (tipoDestino === "FIXO" && !telefone.trim()) ||
                  (evento === "LEAD_STAGE_CHANGED" && !mensagemPrincipal.trim())
                }
              >
                {enviando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Criar Automação
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Automation Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        if (!open) resetEditForm();
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Automação</DialogTitle>
            <DialogDescription>
              Altere as configurações da automação de notificação WhatsApp
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            {formErro && (
              <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600 border border-rose-200">
                {formErro}
              </div>
            )}
            {erro && (
              <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600 border border-rose-200">
                {erro}
              </div>
            )}

            <div className="grid gap-4">
              {/* Instance Selection */}
              <div>
                <label className="text-sm font-medium text-slate-700">Instância WhatsApp</label>
                <select
                  className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  value={instanciaId}
                  onChange={(e) => setInstanciaId(e.target.value)}
                  required
                >
                  <option value="">Selecione...</option>
                  {instancias.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.nome} {inst.phone ? `(${inst.phone})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Event Type */}
              <div>
                <label className="text-sm font-medium text-slate-700">Tipo de Evento</label>
                <select
                  className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  value={evento}
                  onChange={(e) => {
                    limparFeedback();
                    setEvento(e.target.value as "LEAD_STAGE_CHANGED" | "LEAD_FOLLOW_UP");
                  }}
                >
                  <option value="LEAD_STAGE_CHANGED">Mudança de estágio (mensagem imediata)</option>
                  <option value="LEAD_FOLLOW_UP">Follow-up por timeline (mensagens agendadas)</option>
                </select>
              </div>

              {/* Stage Filter (optional) */}
              <div>
                <label className="text-sm font-medium text-slate-700">Filtrar por estágio (opcional)</label>
                <select
                  className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  value={idEstagioDestino}
                  onChange={(e) => {
                    limparFeedback();
                    setIdEstagioDestino(e.target.value);
                  }}
                >
                  <option value="">Todos os estágios</option>
                  {estagios.map((estagio) => (
                    <option key={estagio.id} value={estagio.id}>
                      {estagio.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Type */}
              <div>
                <label className="text-sm font-medium text-slate-700">Destino da Mensagem</label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={`rounded-lg border px-4 py-3 text-sm font-medium transition-all ${
                      tipoDestino === "LEAD_TELEFONE"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                    onClick={() => {
                      limparFeedback();
                      setTipoDestino("LEAD_TELEFONE");
                    }}
                  >
                    📱 Telefone do lead
                  </button>
                  <button
                    type="button"
                    className={`rounded-lg border px-4 py-3 text-sm font-medium transition-all ${
                      tipoDestino === "FIXO"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                    onClick={() => {
                      limparFeedback();
                      setTipoDestino("FIXO");
                    }}
                  >
                    📞 Número específico
                  </button>
                </div>
              </div>

              {/* Fixed Phone Number */}
              {tipoDestino === "FIXO" && (
                <div>
                  <label className="text-sm font-medium text-slate-700">Número de destino</label>
                  <Input
                    className="mt-1.5"
                    placeholder="+55 (11) 99999-9999"
                    value={telefone}
                    onChange={(e) => {
                      limparFeedback();
                      setTelefone(e.target.value);
                    }}
                    required={tipoDestino === "FIXO"}
                  />
                </div>
              )}

              {/* Variables */}
              <div>
                <label className="text-sm font-medium text-slate-700">Variáveis disponíveis</label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {VARIAVEIS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 transition-colors"
                      onClick={() => inserirVariavel(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message for Immediate */}
              {evento === "LEAD_STAGE_CHANGED" && (
                <div>
                  <label className="text-sm font-medium text-slate-700">Mensagem</label>
                  <Textarea
                    className="mt-1.5 min-h-[100px]"
                    placeholder="Ex: Novo lead {{lead_nome}} mudou para {{estagio_novo}}"
                    value={mensagemPrincipal}
                    onChange={(e) => {
                      limparFeedback();
                      setMensagemPrincipal(e.target.value);
                    }}
                    required={evento === "LEAD_STAGE_CHANGED"}
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      Prévia: <span className="text-slate-700">{previewLocalPrincipal || "..."}</span>
                    </p>
                    <Button type="button" size="sm" variant="outline" onClick={gerarPreviewServidor}>
                      Preview Servidor
                    </Button>
                  </div>
                </div>
              )}

              {/* Timeline for Follow-up */}
              {evento === "LEAD_FOLLOW_UP" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">Timeline de Follow-up</label>
                    <Button type="button" variant="outline" size="sm" onClick={adicionarEtapa}>
                      <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar etapa
                    </Button>
                  </div>
                  {etapas.map((etapa, index) => (
                    <div key={index} className="rounded-lg border border-slate-200 p-4 bg-slate-50/50">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-slate-700">Etapa {index + 1}</p>
                        <button
                          type="button"
                          className="text-xs text-rose-600 hover:text-rose-700 disabled:text-slate-300"
                          onClick={() => removerEtapa(index)}
                          disabled={etapas.length <= 1}
                        >
                          Remover
                        </button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="text-xs text-slate-500">Enviar após o trigger</label>
                          <div className="mt-1 flex items-center gap-2">
                            <Input
                              className="h-9 w-24 font-mono"
                              placeholder="9h, 30min, 2h30"
                              value={etapa.delay_texto}
                              onChange={(e) => {
                                const texto = e.target.value;
                                const { horas, minutos } = textoToDelay(texto);
                                atualizarEtapa(index, {
                                  delay_texto: texto,
                                  delay_horas: horas,
                                  delay_minutos: minutos,
                                });
                              }}
                            />
                            <span className="text-xs text-emerald-600 font-medium min-w-[60px]">
                              {etapa.delay_horas > 0 || etapa.delay_minutos > 0 
                                ? (etapa.delay_horas === 0 ? `${etapa.delay_minutos}min` 
                                  : etapa.delay_minutos === 0 ? `${etapa.delay_horas}h`
                                  : `${etapa.delay_horas}h ${etapa.delay_minutos}min`)
                                : ""}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Exemplos: 9h, 30min, 2h30, 1m
                          </p>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">Prévia</label>
                          <p className="mt-1 text-xs text-slate-600 truncate">
                            {renderizarTemplateWhatsapp(etapa.mensagem_template, contextoPreview) || "..."}
                          </p>
                        </div>
                      </div>

                      <Textarea
                        className="mt-3 min-h-[80px]"
                        placeholder="Mensagem desta etapa..."
                        value={etapa.mensagem_template}
                        onChange={(e) => {
                          atualizarEtapa(index, { mensagem_template: e.target.value });
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={resetEditForm}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={
                  enviando ||
                  !instanciaId ||
                  (tipoDestino === "FIXO" && !telefone.trim()) ||
                  (evento === "LEAD_STAGE_CHANGED" && !mensagemPrincipal.trim())
                }
              >
                {enviando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => {
        if (!open) setDeleteConfirmId(null);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-500" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. A automação será removida permanentemente.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-600">
              Tem certeza que deseja excluir esta automação? Todos os agendamentos pendentes serão cancelados.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (deleteConfirmId) {
                  onExcluir(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
              className="bg-rose-600 hover:bg-rose-700"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispatch Progress Overlay */}
      <DispatchOverlay
        open={showDispatchResult}
        resultado={dispatchResultado}
        onClose={() => setShowDispatchResult(false)}
      />
    </div>
  );
}
