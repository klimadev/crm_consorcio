"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Loader2 } from "lucide-react";
import type { Estagio } from "../types";

type EstagiosCardProps = {
  estagios: Estagio[];
  onAtualizar: (id: string, nome: string, ordem: number) => Promise<void>;
};

export function EstagiosCard({ estagios, onAtualizar }: EstagiosCardProps) {
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, { nome: string; ordem: number }>>({});

  const handleChange = (id: string, field: "nome" | "ordem", value: string | number) => {
    setEditValues(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || { nome: estagios.find(e => e.id === id)?.nome || "", ordem: estagios.find(e => e.id === id)?.ordem || 0 }),
        [field]: value
      }
    }));
  };

  const handleBlur = async (id: string) => {
    const estagio = estagios.find(e => e.id === id);
    if (!estagio) return;
    
    const edits = editValues[id];
    if (!edits) return;
    
    const nome = edits.nome.trim();
    const ordem = edits.ordem;
    
    if (nome === estagio.nome && ordem === estagio.ordem) {
      return;
    }
    
    setSavingId(id);
    try {
      await onAtualizar(id, nome, ordem);
      setSavedId(id);
      setTimeout(() => setSavedId(null), 2000);
    } catch (error) {
      console.error("Erro ao atualizar estágio:", error);
    } finally {
      setSavingId(null);
    }
  };

  const getValue = (id: string, field: "nome" | "ordem", defaultValue: string | number) => {
    const edits = editValues[id];
    if (edits) return edits[field];
    return defaultValue;
  };

  return (
    <Card className="rounded-2xl border border-slate-200/60 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <CardHeader className="border-b border-slate-100 px-6 py-4">
        <CardTitle className="text-lg font-bold text-slate-800">Estagios do funil</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-6">
        {estagios.map((estagio) => (
          <div key={`${estagio.id}-${estagio.nome}-${estagio.ordem}`} className="grid gap-2 md:grid-cols-4">
            <div className="relative">
              <Input
                className="h-10 rounded-xl border-slate-200 bg-slate-50/80 pr-10 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50"
                defaultValue={estagio.nome}
                value={getValue(estagio.id, "nome", estagio.nome)}
                onChange={(e) => handleChange(estagio.id, "nome", e.target.value)}
                onBlur={() => handleBlur(estagio.id)}
              />
              {savingId === estagio.id && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
              )}
              {savedId === estagio.id && (
                <Check className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
              )}
            </div>
            <Input
              className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50"
              type="number"
              defaultValue={estagio.ordem}
              value={getValue(estagio.id, "ordem", estagio.ordem)}
              onChange={(e) => handleChange(estagio.id, "ordem", Number(e.target.value))}
              onBlur={() => handleBlur(estagio.id)}
            />
            <Input
              className="h-10 rounded-xl border-slate-200 bg-slate-100 text-sm text-slate-500"
              value={estagio.tipo}
              readOnly
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
