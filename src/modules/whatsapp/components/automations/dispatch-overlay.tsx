"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { WhatsappFollowUpDispatchResultado } from "../../types";

interface DispatchOverlayProps {
  open: boolean;
  resultado: WhatsappFollowUpDispatchResultado | null;
  onClose: () => void;
}

export function DispatchOverlay({ open, resultado, onClose }: DispatchOverlayProps) {
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

            {resultado.metrics && (
              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
                <p>
                  <strong>Metrics:</strong>
                </p>
                <p>Claimed: {resultado.metrics.jobsClaimed}</p>
                <p>Skipped (already claimed): {resultado.metrics.jobsSkippedAlreadyClaimed}</p>
                <p>Duplicates blocked: {resultado.metrics.jobsDuplicateBlocked}</p>
              </div>
            )}

            {resultado.detalhes.length > 0 && (
              <div className="max-h-32 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
                {resultado.detalhes.slice(0, 10).map((detalhe, i) => (
                  <div key={i} className="flex items-center gap-2 py-1 text-xs">
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
              <p className="text-xs text-slate-400 text-center">Run ID: {resultado.runId}</p>
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
