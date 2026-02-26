"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, Check, ChevronRight, ChevronLeft, Zap, Filter, MessageSquare, Clock, Info } from "lucide-react";
import { useAutomationForm, type FormMode, type EtapaForm } from "./use-automation-form";
import { renderizarTemplateWhatsapp } from "@/lib/whatsapp-template";
import type { EstagioFunilOption, WhatsappAutomacao, WhatsappInstancia } from "../../types";

interface AutomationFormDialogProps {
  open: boolean;
  onClose: () => void;
  mode: FormMode;
  automacao?: WhatsappAutomacao;
  instancias: WhatsappInstancia[];
  estagios: EstagioFunilOption[];
  onSubmit: (data: unknown) => Promise<void>;
}

type Step = "trigger" | "filter" | "message" | "schedule";

const STEPS: { id: Step; label: string; description: string; icon: React.ElementType }[] = [
  { id: "trigger", label: "Gatilho", description: "Quando dispara", icon: Zap },
  { id: "filter", label: "Filtro", description: "Quem recebe", icon: Filter },
  { id: "message", label: "Mensagem", description: "O que enviar", icon: MessageSquare },
  { id: "schedule", label: "Revisão", description: "Confirmação", icon: Clock },
];

export function AutomationFormDialog({
  open,
  onClose,
  mode,
  automacao,
  instancias,
  estagios,
  onSubmit,
}: AutomationFormDialogProps) {
  const [currentStep, setCurrentStep] = useState<Step>("trigger");
  const [enviando, setEnviando] = useState(false);

  const form = useAutomationForm(mode, estagios);
  const hasLoadedRef = React.useRef(false);

  useEffect(() => {
    if (!open) {
      hasLoadedRef.current = false;
      return;
    }
    if (hasLoadedRef.current) return;

    if (mode === "edit" && automacao) {
      form.loadFromAutomacao(automacao);
      hasLoadedRef.current = true;
    } else if (mode === "create") {
      form.resetForm();
      hasLoadedRef.current = true;
    }
  }, [open, mode, automacao]);

  const handleClose = () => {
    setCurrentStep("trigger");
    form.resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    const erro = form.validate();
    if (erro) {
      form.setFormErro(erro);
      return;
    }

    setEnviando(true);
    try {
      await onSubmit(form.getPayload());
      handleClose();
    } catch {
      form.setFormErro("Erro ao salvar. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  const handleInserirVariavel = (variavel: string) => {
    if (form.formState.evento === "LEAD_STAGE_CHANGED") {
      form.setMensagemPrincipal(form.formState.mensagemPrincipal + variavel);
    } else {
      const lastIndex = form.formState.etapas.length - 1;
      const currentMessage = form.formState.etapas[lastIndex].mensagem_template;
      form.atualizarEtapa(lastIndex, { mensagem_template: currentMessage + variavel });
    }
  };

  const stepOrder: Step[] = ["trigger", "filter", "message", "schedule"];
  const currentIndex = stepOrder.indexOf(currentStep);

  const goToNextStep = () => {
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  const goToPrevStep = () => {
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  const canGoNext = () => {
    switch (currentStep) {
      case "trigger":
        return !!form.formState.instanciaId && !!form.formState.evento;
      case "filter":
        return true;
      case "message":
        if (form.formState.evento === "LEAD_STAGE_CHANGED") {
          return !!form.formState.mensagemPrincipal.trim();
        }
        return form.formState.etapas.every((e) => !!e.mensagem_template.trim());
      case "schedule":
        return true;
      default:
        return false;
    }
  };

  const getStepStatus = (stepId: Step) => {
    const stepIdx = stepOrder.indexOf(stepId);
    if (stepIdx < currentIndex) return "completed";
    if (stepIdx === currentIndex) return "current";
    return "pending";
  };

  const contextoPreview = {
    lead_nome: "João Silva",
    lead_telefone: "+5511999999999",
    lead_id: "12345",
    estagio_anterior: "Novo",
    estagio_novo: estagios.find((e) => e.id === form.formState.idEstagioDestino)?.nome ?? "FollowUp",
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case "trigger":
        return (
          <StepCard title="Definir Gatilho" description=" Escolha quando esta automação será disparada">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="instancia">Instância WhatsApp</label>
                <select
                  id="instancia"
                  className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  value={form.formState.instanciaId}
                  onChange={(e) => form.setInstanciaId(e.target.value)}
                  required
                >
                  <option value="">Selecione uma instância...</option>
                  {instancias.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.nome} {inst.phone ? `(${inst.phone})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Tipo de Evento</label>
                <div className="grid gap-3">
                  <label
                    className={`flex items-start gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all ${
                      form.formState.evento === "LEAD_STAGE_CHANGED"
                        ? "border-emerald-500 bg-emerald-50/50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="evento"
                      value="LEAD_STAGE_CHANGED"
                      checked={form.formState.evento === "LEAD_STAGE_CHANGED"}
                      onChange={() => form.setEvento("LEAD_STAGE_CHANGED")}
                      className="mt-1 h-4 w-4 text-emerald-600"
                    />
                    <div>
                      <span className="block font-medium text-slate-800">Mensagem Imediata</span>
                      <span className="text-sm text-slate-500">Envia mensagem no momento exato que o lead entra no estágio</span>
                    </div>
                  </label>
                  <label
                    className={`flex items-start gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all ${
                      form.formState.evento === "LEAD_FOLLOW_UP"
                        ? "border-emerald-500 bg-emerald-50/50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="evento"
                      value="LEAD_FOLLOW_UP"
                      checked={form.formState.evento === "LEAD_FOLLOW_UP"}
                      onChange={() => form.setEvento("LEAD_FOLLOW_UP")}
                      className="mt-1 h-4 w-4 text-emerald-600"
                    />
                    <div className="flex-1">
                      <span className="block font-medium text-slate-800">Follow-up Agendado</span>
                      <span className="text-sm text-slate-500">
                        Envia sequência de mensagens X minutos após o lead entrar no estágio
                      </span>
                      {form.formState.evento === "LEAD_FOLLOW_UP" && (
                        <ul className="mt-2 text-xs text-slate-500 space-y-1 bg-slate-100 rounded p-2">
                          <li>• Cada etapa = 1 job agendado</li>
                          <li>• Se lead sair do estágio: jobs são cancelados</li>
                          <li>• Se &quot;Todos os estágios&quot;: cancela os antigos e cria novos</li>
                        </ul>
                      )}
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </StepCard>
        );

      case "filter":
        return (
          <StepCard title="Definir Filtro" description="Configure quem deve receber a mensagem">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="estagio">Estágio do Lead</label>
                <select
                  id="estagio"
                  className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  value={form.formState.idEstagioDestino}
                  onChange={(e) => form.setIdEstagioDestino(e.target.value)}
                >
                  <option value="">Todos os estágios</option>
                  {estagios.map((estagio) => (
                    <option key={estagio.id} value={estagio.id}>
                      {estagio.nome}
                    </option>
                  ))}
                </select>
                <div className="text-xs text-slate-500 space-y-1">
                  <p><span className="font-medium">Estágio específico:</span> cria jobs apenas quando o lead entra nesse estágio</p>
                  <p><span className="font-medium">Todos os estágios:</span> cancela os jobs antigos e cria novos para o novo estágio</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Destino da Mensagem</label>
                <div className="grid gap-3">
                  <label
                    className={`flex items-start gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all ${
                      form.formState.tipoDestino === "LEAD_TELEFONE"
                        ? "border-emerald-500 bg-emerald-50/50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipoDestino"
                      value="LEAD_TELEFONE"
                      checked={form.formState.tipoDestino === "LEAD_TELEFONE"}
                      onChange={() => form.setTipoDestino("LEAD_TELEFONE")}
                      className="mt-1 h-4 w-4 text-emerald-600"
                    />
                    <div>
                      <span className="block font-medium text-slate-800">Telefone do Lead</span>
                      <span className="text-sm text-slate-500">Envia para o número cadastrado no lead</span>
                    </div>
                  </label>
                  <label
                    className={`flex items-start gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all ${
                      form.formState.tipoDestino === "FIXO"
                        ? "border-emerald-500 bg-emerald-50/50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipoDestino"
                      value="FIXO"
                      checked={form.formState.tipoDestino === "FIXO"}
                      onChange={() => form.setTipoDestino("FIXO")}
                      className="mt-1 h-4 w-4 text-emerald-600"
                    />
                    <div className="flex-1">
                      <span className="block font-medium text-slate-800">Número Específico</span>
                      <span className="text-sm text-slate-500">Envia para um número fixo</span>
                      {form.formState.tipoDestino === "FIXO" && (
                        <Input
                          className="mt-2 h-10"
                          placeholder="+55 (11) 99999-9999"
                          value={form.formState.telefone}
                          onChange={(e) => form.setTelefone(e.target.value)}
                        />
                      )}
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </StepCard>
        );

      case "message":
        const isFollowUp = form.formState.evento === "LEAD_FOLLOW_UP";
        return (
          <StepCard
            title={isFollowUp ? "Configurar Timeline" : "Criar Mensagem"}
            description={isFollowUp ? "Defina a sequência de mensagens" : "Escreva a mensagem que será enviada"}
          >
            <div className="space-y-6">
              <VariableChips onSelect={handleInserirVariavel} />

              {isFollowUp ? (
                <FollowupTimelineEditorV2
                  etapas={form.formState.etapas}
                  contextoPreview={contextoPreview}
                  onAdicionarEtapa={form.adicionarEtapa}
                  onAtualizarEtapa={form.atualizarEtapa}
                  onRemoverEtapa={form.removerEtapa}
                />
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="mensagem">Mensagem</label>
                  <Textarea
                    id="mensagem"
                    className="min-h-[160px] text-sm"
                    placeholder="Ex: Olá {{lead_nome}}, tudo bem? Vi que você avançou para {{estagio_novo}}!"
                    value={form.formState.mensagemPrincipal}
                    onChange={(e) => form.setMensagemPrincipal(e.target.value)}
                  />
                  <p className="text-xs text-slate-500">
                    Prévia:{" "}
                    <span className="text-emerald-600 font-medium">
                      {renderizarTemplateWhatsapp(form.formState.mensagemPrincipal, contextoPreview) || "..."}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </StepCard>
        );

      case "schedule":
        const instanciaNome = instancias.find((i) => i.id === form.formState.instanciaId)?.nome ?? "—";
        const estagioNome = estagios.find((e) => e.id === form.formState.idEstagioDestino)?.nome ?? "Todos";

        return (
          <StepCard title="Revisar e Confirmar" description="Verifique as configurações antes de salvar">
            <div className="space-y-6">
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
                <div className="flex items-center gap-2 text-emerald-700 font-medium mb-3">
                  <Check className="h-5 w-5" />
                  Resumo da Automação
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-slate-500">Instância</dt>
                    <dd className="font-medium text-slate-800">{instanciaNome}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Evento</dt>
                    <dd className="font-medium text-slate-800">
                      {form.formState.evento === "LEAD_STAGE_CHANGED" ? "Mudança de Estágio" : "Follow-up Timeline"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Estágio</dt>
                    <dd className="font-medium text-slate-800">{estagioNome}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Destino</dt>
                    <dd className="font-medium text-slate-800">
                      {form.formState.tipoDestino === "LEAD_TELEFONE" ? "Telefone do Lead" : form.formState.telefone}
                    </dd>
                  </div>
                  {form.formState.evento === "LEAD_FOLLOW_UP" && (
                    <div className="col-span-2">
                      <dt className="text-slate-500">Mensagens</dt>
                      <dd className="font-medium text-slate-800">{form.formState.etapas.length} etapa(s) configurada(s)</dd>
                    </div>
                  )}
                </dl>
              </div>

              <div className="flex items-start gap-3 rounded-lg bg-blue-50 border border-blue-200 p-4">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium">Pronto para {mode === "create" ? "criar" : "salvar"}!</p>
                  <p className="text-blue-600">Clique no botão abaixo para finalizar.</p>
                </div>
              </div>
            </div>
          </StepCard>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="text-xl">
            {mode === "create" ? "Nova Automação" : "Editar Automação"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Crie uma automação para enviar mensagens pelo WhatsApp automaticamente"
              : "Altere as configurações da automação"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <nav aria-label="Progresso" className="mb-6 shrink-0">
            <ol className="flex items-center justify-between">
              {STEPS.map((step, index) => {
                const status = getStepStatus(step.id);
                const Icon = step.icon;
                const isLast = index === STEPS.length - 1;

                return (
                  <li key={step.id} className={`flex items-center ${isLast ? "flex-1" : "flex-1"}`}>
                    <button
                      type="button"
                      onClick={() => {
                        const targetIndex = stepOrder.indexOf(step.id);
                        if (targetIndex <= currentIndex || canGoNext()) {
                          setCurrentStep(step.id);
                        }
                      }}
                      disabled={stepOrder.indexOf(step.id) > currentIndex && !canGoNext()}
                      className={`flex flex-col items-center text-center group ${
                        stepOrder.indexOf(step.id) > currentIndex && !canGoNext() ? "opacity-40 cursor-not-allowed" : ""
                      }`}
                      aria-current={status === "current" ? "step" : undefined}
                    >
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                          status === "completed"
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : status === "current"
                            ? "border-emerald-500 bg-white text-emerald-600 ring-4 ring-emerald-500/20"
                            : "border-slate-300 bg-white text-slate-400"
                        }`}
                      >
                        {status === "completed" ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                      </span>
                      <span
                        className={`mt-2 text-xs font-medium ${
                          status === "current" ? "text-emerald-600" : "text-slate-500"
                        }`}
                      >
                        {step.label}
                      </span>
                    </button>
                    {!isLast && (
                      <div
                        className={`flex-1 h-0.5 mx-2 ${
                          stepOrder.indexOf(step.id) < currentIndex ? "bg-emerald-500" : "bg-slate-200"
                        }`}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>

          {form.formErro && (
            <div
              className="mb-4 rounded-lg bg-rose-50 p-4 text-sm text-rose-600 border border-rose-200 shrink-0"
              role="alert"
            >
              {form.formErro}
            </div>
          )}

          <div className="min-h-0">{renderStepContent()}</div>
        </div>

        <DialogFooter className="px-6 py-4 border-t gap-3 shrink-0">
          {currentIndex > 0 && (
            <Button type="button" variant="outline" onClick={goToPrevStep} className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </Button>
          )}
          <div className="flex-1" />
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          {currentIndex < stepOrder.length - 1 ? (
            <Button type="button" onClick={goToNextStep} disabled={!canGoNext()} className="gap-2">
              Próximo
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={enviando || !form.isValid}
              className="bg-emerald-600 hover:bg-emerald-700 gap-2"
            >
              {enviando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  {mode === "create" ? "Criar Automação" : "Salvar Alterações"}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      {children}
    </div>
  );
}

function VariableChips({ onSelect }: { onSelect: (variavel: string) => void }) {
  const variaveis = [
    { key: "{{lead_nome}}", label: "Nome do Lead" },
    { key: "{{lead_telefone}}", label: "Telefone" },
    { key: "{{lead_id}}", label: "ID do Lead" },
    { key: "{{estagio_anterior}}", label: "Estágio Anterior" },
    { key: "{{estagio_novo}}", label: "Novo Estágio" },
  ];

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">Variáveis disponíveis</label>
      <div className="flex flex-wrap gap-2">
        {variaveis.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => onSelect(v.key)}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors"
          >
            <span className="font-mono text-xs">{v.key}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function FollowupTimelineEditorV2({
  etapas,
  contextoPreview,
  onAdicionarEtapa,
  onAtualizarEtapa,
  onRemoverEtapa,
}: {
  etapas: EtapaForm[];
  contextoPreview: Record<string, string>;
  onAdicionarEtapa: () => void;
  onAtualizarEtapa: (index: number, dados: Partial<EtapaForm>) => void;
  onRemoverEtapa: (index: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">Timeline de Follow-up</label>
        <Button type="button" variant="outline" size="sm" onClick={onAdicionarEtapa}>
          + Adicionar etapa
        </Button>
      </div>

      <div className="space-y-4">
        {etapas.map((etapa, index) => (
          <div key={index} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700">Etapa {index + 1}</span>
              {etapas.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemoverEtapa(index)}
                  className="text-xs text-rose-600 hover:text-rose-700"
                >
                  Remover
                </button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs">Enviar após</label>
                <Input
                  className="h-9 font-mono text-sm"
                  placeholder="Ex: 9h, 30min, 2h30"
                  value={etapa.delay_texto}
                  onChange={(e) => onAtualizarEtapa(index, { delay_texto: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs">Prévia</label>
                <p className="text-xs text-emerald-600 truncate pt-2">
                  {renderizarTemplateWhatsapp(etapa.mensagem_template, contextoPreview) || "..."}
                </p>
              </div>
            </div>

            <Textarea
              className="min-h-[80px] text-sm"
              placeholder="Digite a mensagem desta etapa..."
              value={etapa.mensagem_template}
              onChange={(e) => onAtualizarEtapa(index, { mensagem_template: e.target.value })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
