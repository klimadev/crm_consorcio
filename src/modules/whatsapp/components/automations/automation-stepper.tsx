"use client";

import { useMemo } from "react";
import { Check, Zap, Filter, MessageSquare, Clock, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { EstagioFunilOption, WhatsappInstancia } from "../../types";
import type { FormState } from "./use-automation-form";

export type Step = "trigger" | "filter" | "message" | "schedule";

interface AutomationStepperProps {
  formState: FormState;
  estagios: EstagioFunilOption[];
  instancias: WhatsappInstancia[];
  onChangeStep: (step: Step) => void;
  currentStep: Step;
  onUpdateField: <K extends keyof FormState>(field: K, value: FormState[K]) => void;
  renderMessageStep: (contextoPreview: Record<string, string>) => React.ReactNode;
}

const STEPS: { id: Step; label: string; icon: React.ElementType }[] = [
  { id: "trigger", label: "Gatilho", icon: Zap },
  { id: "filter", label: "Filtro", icon: Filter },
  { id: "message", label: "Mensagem", icon: MessageSquare },
  { id: "schedule", label: "Agendamento", icon: Clock },
];

function StepIndicator({
  steps,
  currentStep,
  onStepClick,
  isStepValid,
}: {
  steps: typeof STEPS;
  currentStep: Step;
  onStepClick: (step: Step) => void;
  isStepValid: (step: Step) => boolean;
}) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="flex items-center justify-between mb-6">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isCompleted = index < currentIndex || isStepValid(step.id);
        const isCurrent = step.id === currentStep;

        return (
          <div key={step.id} className="flex items-center flex-1">
            <button
              type="button"
              onClick={() => onStepClick(step.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                isCurrent
                  ? "bg-emerald-50 border border-emerald-200"
                  : isCompleted
                  ? "bg-white border border-slate-200 hover:border-emerald-300"
                  : "bg-slate-50 border border-slate-200 opacity-50"
              }`}
              disabled={!isStepValid(step.id) && index > currentIndex}
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full ${
                  isCompleted
                    ? "bg-emerald-500 text-white"
                    : isCurrent
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span
                className={`text-sm font-medium ${
                  isCurrent ? "text-emerald-700" : isCompleted ? "text-slate-700" : "text-slate-400"
                }`}
              >
                {step.label}
              </span>
            </button>
            {index < steps.length - 1 && (
              <ChevronRight className="mx-2 h-4 w-4 text-slate-300 flex-shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AutomationStepper({
  formState,
  estagios,
  instancias,
  onChangeStep,
  currentStep,
  onUpdateField,
  renderMessageStep,
}: AutomationStepperProps) {
  const isStepValid = useMemo(() => {
    return (step: Step): boolean => {
      switch (step) {
        case "trigger":
          return !!formState.instanciaId && !!formState.evento;
        case "filter":
          return true;
        case "message":
          if (formState.evento === "LEAD_STAGE_CHANGED") {
            return !!formState.mensagemPrincipal.trim();
          }
          return formState.etapas.every((e) => !!e.mensagem_template.trim());
        case "schedule":
          return true;
        default:
          return false;
      }
    };
  }, [formState]);

  const canProceed = (targetStep: Step): boolean => {
    const stepOrder: Step[] = ["trigger", "filter", "message", "schedule"];
    const currentIndex = stepOrder.indexOf(currentStep);
    const targetIndex = stepOrder.indexOf(targetStep);

    if (targetIndex <= currentIndex) return true;

    for (let i = currentIndex; i < targetIndex; i++) {
      if (!isStepValid(stepOrder[i])) return false;
    }
    return true;
  };

  const handleStepClick = (step: Step) => {
    if (canProceed(step)) {
      onChangeStep(step);
    }
  };

  const contextoPreview = useMemo(
    () => ({
      lead_nome: "João Silva",
      lead_telefone: "+5511999999999",
      lead_id: "12345",
      estagio_anterior: "Novo",
      estagio_novo: estagios.find((e) => e.id === formState.idEstagioDestino)?.nome ?? "FollowUp",
    }),
    [estagios, formState.idEstagioDestino]
  );

  return (
    <div className="space-y-4">
      <StepIndicator
        steps={STEPS}
        currentStep={currentStep}
        onStepClick={handleStepClick}
        isStepValid={isStepValid}
      />

      {currentStep === "trigger" && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Instância WhatsApp</label>
            <select
              className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              value={formState.instanciaId}
              onChange={(e) => onUpdateField("instanciaId", e.target.value)}
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

          <div>
            <label className="text-sm font-medium text-slate-700">Tipo de Evento</label>
            <select
              className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              value={formState.evento}
              onChange={(e) =>
                onUpdateField("evento", e.target.value as "LEAD_STAGE_CHANGED" | "LEAD_FOLLOW_UP")
              }
            >
              <option value="LEAD_STAGE_CHANGED">Mudança de estágio (mensagem imediata)</option>
              <option value="LEAD_FOLLOW_UP">Follow-up por timeline (mensagens agendadas)</option>
            </select>
          </div>

          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm font-medium text-slate-700 mb-2">Resumo do Gatilho</p>
            <p className="text-xs text-slate-500">
              {formState.evento === "LEAD_STAGE_CHANGED"
                ? "Quando um lead mudar de estágio, uma mensagem será enviada imediatamente."
                : "Quando um lead mudar de estágio, uma sequência de mensagens será agendada ao longo do tempo."}
            </p>
          </div>
        </div>
      )}

      {currentStep === "filter" && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">
              Filtrar por estágio (opcional)
            </label>
            <select
              className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              value={formState.idEstagioDestino}
              onChange={(e) => onUpdateField("idEstagioDestino", e.target.value)}
            >
              <option value="">Todos os estágios</option>
              {estagios.map((estagio) => (
                <option key={estagio.id} value={estagio.id}>
                  {estagio.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Destino da Mensagem</label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`rounded-lg border px-4 py-3 text-sm font-medium transition-all ${
                  formState.tipoDestino === "LEAD_TELEFONE"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
                onClick={() => onUpdateField("tipoDestino", "LEAD_TELEFONE")}
              >
                📱 Telefone do lead
              </button>
              <button
                type="button"
                className={`rounded-lg border px-4 py-3 text-sm font-medium transition-all ${
                  formState.tipoDestino === "FIXO"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
                onClick={() => onUpdateField("tipoDestino", "FIXO")}
              >
                📞 Número específico
              </button>
            </div>
          </div>

          {formState.tipoDestino === "FIXO" && (
            <div>
              <label className="text-sm font-medium text-slate-700">Número de destino</label>
              <Input
                className="mt-1.5"
                placeholder="+55 (11) 99999-9999"
                value={formState.telefone}
                onChange={(e) => onUpdateField("telefone", e.target.value)}
                required={formState.tipoDestino === "FIXO"}
              />
            </div>
          )}
        </div>
      )}

      {currentStep === "message" && renderMessageStep(contextoPreview)}

      {currentStep === "schedule" && (
        <div className="space-y-4">
          <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
            <p className="text-sm font-semibold text-emerald-800 mb-2">Resumo da Automação</p>
            <div className="text-xs text-emerald-700 space-y-1">
              <p>
                <strong>Instância:</strong>{" "}
                {instancias.find((i) => i.id === formState.instanciaId)?.nome ?? "—"}
              </p>
              <p>
                <strong>Evento:</strong>{" "}
                {formState.evento === "LEAD_STAGE_CHANGED"
                  ? "Mudança de estágio"
                  : "Follow-up por timeline"}
              </p>
              <p>
                <strong>Destino:</strong>{" "}
                {formState.tipoDestino === "LEAD_TELEFONE"
                  ? "Telefone do lead"
                  : formState.telefone}
              </p>
              {formState.evento === "LEAD_FOLLOW_UP" && (
                <p>
                  <strong>Etapas:</strong> {formState.etapas.length} mensagens agendadas
                </p>
              )}
            </div>
          </div>

          <div className="text-center py-4">
            <p className="text-sm text-slate-600">
              Revise as informações acima e clique em{" "}
              <strong>{formState.evento === "LEAD_STAGE_CHANGED" ? "Criar" : "Salvar"}</strong> para
              finalizar.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
