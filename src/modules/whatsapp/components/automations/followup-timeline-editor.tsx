"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { parseHorarioTexto } from "@/lib/parse-horario-texto";
import { renderizarTemplateWhatsapp } from "@/lib/whatsapp-template";
import type { EtapaForm } from "./use-automation-form";

interface FollowupTimelineEditorProps {
  etapas: EtapaForm[];
  contextoPreview: Record<string, string>;
  onAdicionarEtapa: () => void;
  onAtualizarEtapa: (index: number, dados: Partial<EtapaForm>) => void;
  onRemoverEtapa: (index: number) => void;
  disabled?: boolean;
}

export function FollowupTimelineEditor({
  etapas,
  contextoPreview,
  onAdicionarEtapa,
  onAtualizarEtapa,
  onRemoverEtapa,
  disabled = false,
}: FollowupTimelineEditorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">Timeline de Follow-up</label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAdicionarEtapa}
          disabled={disabled}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar etapa
        </Button>
      </div>

      {etapas.map((etapa, index) => {
        const delayTexto =
          etapa.delay_horas > 0 || etapa.delay_minutos > 0
            ? etapa.delay_horas === 0
              ? `${etapa.delay_minutos}min`
              : etapa.delay_minutos === 0
              ? `${etapa.delay_horas}h`
              : `${etapa.delay_horas}h ${etapa.delay_minutos}min`
            : "";

        return (
          <div
            key={index}
            className="rounded-lg border border-slate-200 bg-slate-50/50 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-700">Etapa {index + 1}</p>
              <button
                type="button"
                className="text-xs text-rose-600 hover:text-rose-700 disabled:text-slate-300 flex items-center gap-1"
                onClick={() => onRemoverEtapa(index)}
                disabled={etapas.length <= 1 || disabled}
              >
                <Trash2 className="h-3 w-3" />
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
                      const resultado = parseHorarioTexto(texto);
                      if (resultado.ok) {
                        const horas = Math.floor(resultado.delay_minutos / 60);
                        const minutos = resultado.delay_minutos % 60;
                        onAtualizarEtapa(index, {
                          delay_texto: texto,
                          delay_horas: horas,
                          delay_minutos: minutos,
                        });
                      } else {
                        onAtualizarEtapa(index, { delay_texto: texto });
                      }
                    }}
                    disabled={disabled}
                  />
                  <span className="text-xs text-emerald-600 font-medium min-w-[60px]">
                    {delayTexto}
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
              onChange={(e) => onAtualizarEtapa(index, { mensagem_template: e.target.value })}
              disabled={disabled}
            />
          </div>
        );
      })}
    </div>
  );
}
