"use client";

import { cn } from "@/lib/utils";
import type { TooltipRenderProps } from "@/modules/onboarding/types";

export function OnboardingTooltip({
  index,
  isLastStep,
  onNext,
  onPrev,
  onSkip,
  size,
  step,
}: TooltipRenderProps) {
  return (
    <div
      className="w-[min(92vw,420px)] rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      aria-describedby="tour-description"
    >
      <div className="space-y-3">
        <p id="tour-title" className="text-xl font-bold leading-tight text-slate-900">
          {step.title}
        </p>
        <p id="tour-description" className="text-base leading-relaxed text-slate-700">
          {step.content}
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-200 pt-4">
        <div className="text-sm font-medium text-slate-500" aria-live="polite">
          <span className="sr-only">Passo </span>
          {index + 1} de {size}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSkip}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
            aria-label="Pular tour"
          >
            Pular
          </button>

          {index > 0 ? (
            <button
              type="button"
              onClick={onPrev}
              className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
              aria-label="Voltar para passo anterior"
            >
              Voltar
            </button>
          ) : null}

          <button
            type="button"
            onClick={onNext}
            className={cn(
              "rounded-lg px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all duration-200",
              "bg-indigo-600 hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
              "active:bg-indigo-700",
            )}
            aria-label={isLastStep ? "Concluir tour" : "Avançar para próximo passo"}
          >
            {isLastStep ? "Concluir" : "Continuar"}
          </button>
        </div>
      </div>
    </div>
  );
}
