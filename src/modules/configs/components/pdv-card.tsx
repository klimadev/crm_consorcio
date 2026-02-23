"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OptimisticSync } from "@/components/ui/optimistic-sync";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Pdv } from "../types";

type PdvCardProps = {
  pdvs: Pdv[];
  onAtualizar: (id: string, nome: string) => Promise<void>;
  onExcluir: (id: string) => Promise<void>;
  onCriar: (evento: React.FormEvent<HTMLFormElement>) => Promise<void>;
};

export function PdvCard({ pdvs, onAtualizar, onExcluir, onCriar }: PdvCardProps) {
  return (
    <Card className="rounded-2xl border border-slate-200/60 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <CardHeader className="border-b border-slate-100 px-6 py-4">
        <CardTitle className="text-lg font-bold text-slate-800">PDVs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        <form className="flex gap-3" onSubmit={onCriar}>
          <Input
            className="h-11 rounded-xl border-slate-200 bg-slate-50/80 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50"
            name="nome"
            placeholder="Nome do PDV"
            required
          />
          <Button className="rounded-xl bg-slate-800 font-medium text-white hover:bg-slate-700">
            Adicionar
          </Button>
        </form>

        <div className="space-y-2">
          {pdvs.map((pdv) => {
            const isTemporario = pdv.id.startsWith("temp-");

            return (
              <OptimisticSync key={`${pdv.id}-${pdv.nome}`} active={isTemporario} className="cursor-wait">
                <div className={isTemporario ? "flex cursor-wait gap-2" : "flex gap-2"}>
                  <Input
                    className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50"
                    defaultValue={pdv.nome}
                    disabled={isTemporario}
                    onBlur={(e) => {
                      if (isTemporario) return;
                      void onAtualizar(pdv.id, e.target.value);
                    }}
                  />
                  <Button
                    className="rounded-xl border border-rose-200 bg-white text-sm font-medium text-rose-600 hover:bg-rose-50"
                    variant="outline"
                    disabled={isTemporario}
                    onClick={() => {
                      if (isTemporario) return;
                      void onExcluir(pdv.id);
                    }}
                  >
                    Excluir
                  </Button>
                </div>
              </OptimisticSync>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
