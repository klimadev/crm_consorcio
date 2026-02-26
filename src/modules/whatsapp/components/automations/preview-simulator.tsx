"use client";

import { renderizarTemplateWhatsapp } from "@/lib/whatsapp-template";
import { Smartphone, User, Send } from "lucide-react";
import type { EtapaForm } from "./use-automation-form";

interface PreviewSimulatorProps {
  mensagem?: string;
  etapas?: EtapaForm[];
  evento: "LEAD_STAGE_CHANGED" | "LEAD_FOLLOW_UP";
  contextoPreview: Record<string, string>;
}

export function PreviewSimulator({
  mensagem,
  etapas,
  evento,
  contextoPreview,
}: PreviewSimulatorProps) {
  const isFollowUp = evento === "LEAD_FOLLOW_UP";

  const renderPreview = (text: string) => {
    return renderizarTemplateWhatsapp(text, contextoPreview) || "...";
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[280px] overflow-hidden rounded-[24px] border-4 border-zinc-800 bg-white shadow-xl">
        <div className="flex h-8 items-center justify-between bg-zinc-800 px-3 py-1">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-full bg-zinc-600 flex items-center justify-center">
              <User className="h-3 w-3 text-white" />
            </div>
            <span className="text-xs font-medium text-white">CRM Consórcio</span>
          </div>
          <Smartphone className="h-4 w-4 text-zinc-500" />
        </div>

        <div className="h-[280px] overflow-y-auto p-3 space-y-3 bg-zinc-100">
          {isFollowUp && etapas && etapas.length > 0 ? (
            <>
              <div className="flex justify-center">
                <span className="text-[10px] text-zinc-400">Trigger: Lead entrou no funil</span>
              </div>
              {etapas.map((etapa, index) => {
                const delayLabel =
                  etapa.delay_horas > 0 || etapa.delay_minutos > 0
                    ? etapa.delay_horas === 0
                      ? `${etapa.delay_minutos}min`
                      : etapa.delay_minutos === 0
                      ? `${etapa.delay_horas}h`
                      : `${etapa.delay_horas}h ${etapa.delay_minutos}min`
                    : "Imediato";
                return (
                  <div key={index}>
                    <div className="flex justify-center mb-1">
                      <span className="text-[9px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        +{delayLabel}
                      </span>
                    </div>
                    <div className="bg-white rounded-lg rounded-tl-none p-2.5 shadow-sm max-w-[85%] ml-auto">
                      <p className="text-xs text-zinc-800 whitespace-pre-wrap">
                        {renderPreview(etapa.mensagem_template)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </>
          ) : mensagem ? (
            <div className="bg-white rounded-lg rounded-tl-none p-2.5 shadow-sm max-w-[85%] ml-auto">
              <p className="text-xs text-zinc-800 whitespace-pre-wrap">{renderPreview(mensagem)}</p>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-xs text-zinc-400">Digite uma mensagem para ver o preview</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 bg-white p-2 border-t">
          <div className="flex-1 rounded-full bg-zinc-100 px-3 py-1.5 text-xs text-zinc-400">
            Digite uma mensagem...
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500">
            <Send className="h-3 w-3 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
