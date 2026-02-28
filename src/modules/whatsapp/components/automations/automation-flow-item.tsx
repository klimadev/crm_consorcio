"use client";

import { Zap, Check, X, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { Clock3, ArrowRight, AlertCircle } from "lucide-react";
import type { WhatsappAutomacao } from "../../types";

interface AutomationFlowItemProps {
  automacao: WhatsappAutomacao;
  instanciaNome: string;
  onToggle: (id: string, ativo: boolean) => void;
  onEdit: (automacao: WhatsappAutomacao) => void;
  onRequestDelete: (id: string) => void;
}

export function AutomationFlowItem({
  automacao,
  instanciaNome,
  onToggle,
  onEdit,
  onRequestDelete,
}: AutomationFlowItemProps) {
  const isFollowUp = automacao.evento === "LEAD_FOLLOW_UP";
  const isError = automacao.status === "ERRO_CONFIG" || automacao.status === "ERRO_JOB";

  return (
    <Card
      className={`group overflow-hidden rounded-xl border transition-all hover:shadow-md ${
        isError
          ? "border-rose-200/60 bg-rose-50/30"
          : "border-slate-200/60 bg-white hover:border-slate-300/60"
      }`}
    >
      <CardContent className="p-0">
        <div className="flex items-center gap-0">
          <div className="flex-1 bg-gradient-to-r from-slate-50 to-white p-4 border-r border-slate-100">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  isFollowUp ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                }`}
              >
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {isFollowUp ? "Follow-up Timeline" : "Mudança de Estágio"}
                </p>
                <p className="text-xs text-slate-500">{instanciaNome}</p>
              </div>
            </div>
          </div>

          <div className="flex h-12 w-12 items-center justify-center bg-slate-50">
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </div>

          <div className="flex-1 bg-gradient-to-r from-white to-slate-50 p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                {isFollowUp ? (
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium text-slate-700">
                      {automacao.etapas?.length ?? 0} etapa
                      {automacao.etapas?.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                ) : (
                  <p className="truncate text-sm text-slate-600 max-w-[200px]">
                    {automacao.mensagem || "Sem mensagem"}
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-400">
                  {automacao.tipo_destino === "FIXO"
                    ? automacao.telefone_destino
                    : "Telefone do lead"}
                </p>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border shrink-0 ${
                  automacao.status === "ATIVA" && automacao.ativo
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : isError
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-slate-100 text-slate-500 border-slate-200"
                }`}
              >
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

          <div className="flex items-center gap-1 border-l border-slate-100 bg-slate-50/50 px-2">
<Tooltip content={automacao.ativo ? "Desativar" : "Ativar"}>
            <button
              type="button"
              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                automacao.ativo
                  ? "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                  : "border-slate-200 bg-white text-slate-400 hover:bg-slate-100"
              }`}
              onClick={() => onToggle(automacao.id, !automacao.ativo)}
            >
              {automacao.ativo ? (
                <Check className="h-4 w-4" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </button>
            </Tooltip>
            <Tooltip content="Editar automação">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-blue-600"
              onClick={() => onEdit(automacao)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
            </Button>
            </Tooltip>
            <Tooltip content="Excluir automação">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-rose-600"
              onClick={() => onRequestDelete(automacao.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            </Tooltip>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
