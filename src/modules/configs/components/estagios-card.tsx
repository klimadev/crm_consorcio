"use client";

import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Estagio } from "../types";

type EstagiosCardProps = {
  estagios: Estagio[];
  onAtualizar: (id: string, nome: string, ordem: number) => Promise<void>;
};

export function EstagiosCard({ estagios, onAtualizar }: EstagiosCardProps) {
  return (
    <Card className="rounded-2xl border border-slate-200/60 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <CardHeader className="border-b border-slate-100 px-6 py-4">
        <CardTitle className="text-lg font-bold text-slate-800">Estagios do funil</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-6">
        {estagios.map((estagio) => (
          <div key={`${estagio.id}-${estagio.nome}-${estagio.ordem}`} className="grid gap-2 md:grid-cols-4">
            <Input
              className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50"
              defaultValue={estagio.nome}
              onBlur={(e) => onAtualizar(estagio.id, e.target.value, estagio.ordem)}
            />
            <Input
              className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50"
              type="number"
              defaultValue={estagio.ordem}
              onBlur={(e) => onAtualizar(estagio.id, estagio.nome, Number(e.target.value))}
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
