"use client";

import { useState } from "react";
import { CheckCircle2, AlertCircle, Copy, Download, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { ExportResultado } from "../types";

type Props = {
  resultado: ExportResultado;
};

export function ResultadoDump({ resultado }: Props) {
  const [expandido, setExpandido] = useState(false);
  const { addToast } = useToast();

  const handleCopiar = async () => {
    if (!resultado.dump) return;
    try {
      await navigator.clipboard.writeText(resultado.dump);
      addToast({ type: "success", title: "Copiado!", description: "Texto copiado para a area de transferencia." });
    } catch {
      addToast({ type: "error", title: "Erro", description: "Nao foi possivel copiar o texto." });
    }
  };

  const handleDownload = () => {
    if (!resultado.dump) return;
    const data = new Date().toISOString().slice(0, 10);
    const nomeArquivo = `whatsapp-export-${resultado.instanceName}-${data}.txt`;
    const blob = new Blob([resultado.dump], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sucesso = resultado.status === "sucesso";

  return (
    <div
      className={cn(
        "rounded-xl border bg-background-surface",
        sucesso
          ? "border-emerald-500/20"
          : "border-rose-500/20",
      )}
    >
      <button
        type="button"
        onClick={() => setExpandido(!expandido)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/30"
      >
        {sucesso ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
        ) : (
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {resultado.instanceLabel}
          </p>
          {sucesso && resultado.stats && (
            <p className="text-xs text-foreground-muted">
              {resultado.stats.chats} chats · {resultado.stats.mensagens} mensagens ·{" "}
              {resultado.stats.periodoInicio} a {resultado.stats.periodoFim}
            </p>
          )}
          {!sucesso && (
            <p className="text-xs text-rose-400">{resultado.erro}</p>
          )}
        </div>

        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-foreground-muted transition-transform",
            expandido && "rotate-180",
          )}
        />
      </button>

      {expandido && sucesso && resultado.dump && (
        <div className="border-t border-border px-4 py-3">
          <pre className="max-h-96 overflow-auto rounded-lg bg-muted/30 p-4 text-xs leading-relaxed text-foreground-muted whitespace-pre-wrap font-mono select-all">
            {resultado.dump}
          </pre>
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopiar}
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Copiar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Download .txt
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
