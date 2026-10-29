"use client";

import { useRef, useState } from "react";
import { Loader2, PenLine, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import type { Parcela } from "@/lib/api/parcelas";

type NotaCobrancaProps = {
  parcela: Parcela;
  podeEditar: boolean;
  onSalvar: (observacao: string | null) => Promise<boolean>;
};

// A nota de cobrança carrega o contexto humano da negociação ("pediu prazo
// até sexta") junto da parcela, onde a operadora precisa dele na hora de cobrar.
export function NotaCobranca({ parcela, podeEditar, onSalvar }: NotaCobrancaProps) {
  const { addToast } = useToast();
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(parcela.observacao_cobranca ?? "");
  const [salvando, setSalvando] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);


  useEffect(() => {
    if (editando) textareaRef.current?.focus();
  }, [editando]);

  const salvar = async () => {
    const observacao = texto.trim() ? texto.trim() : null;
    setSalvando(true);
    const ok = await onSalvar(observacao);
    setSalvando(false);

    if (ok) {
      addToast({
        type: "success",
        title: observacao ? "Observação salva" : "Observação removida",
      });
      setEditando(false);
    }
  };

  if (editando) {
    return (
      <div className="space-y-2">
        <Textarea
          ref={textareaRef}
          value={texto}
          onChange={(event) => setTexto(event.target.value)}
          maxLength={500}
          placeholder="Ex.: cliente avisou que paga sexta."
          disabled={salvando}
          className="min-h-16 text-sm"
        />
        <div className="flex gap-2">
          <Button type="button" size="sm" className="min-h-9 rounded-lg" onClick={() => void salvar()} disabled={salvando}>
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="min-h-9 rounded-lg"
            onClick={() => setEditando(false)}
            disabled={salvando}
          >
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  if (parcela.observacao_cobranca) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-warning/25 bg-warning/10 px-3 py-2 text-xs text-foreground">
        <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
        <p className="flex-1">{parcela.observacao_cobranca}</p>
        {podeEditar ? (
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="shrink-0 rounded p-0.5 text-foreground-muted transition-colors hover:text-foreground"
            aria-label="Editar observação"
          >
            <PenLine className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    );
  }

  if (!podeEditar) return null;

  return (
    <button
      type="button"
      onClick={() => setEditando(true)}
      className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-foreground-muted transition-colors hover:bg-muted hover:text-foreground"
    >
      <PenLine className="h-3.5 w-3.5" />
      Anotar cobrança
    </button>
  );
}
