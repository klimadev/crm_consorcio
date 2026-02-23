"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UseEquipeModuleReturn } from "../types";

type EquipeBulkActionsProps = {
  vm: UseEquipeModuleReturn;
};

export function EquipeBulkActions({ vm }: EquipeBulkActionsProps) {
  if (!vm.podeExecutarAcoesLote || vm.idsSelecionados.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3 rounded-xl border border-blue-200/40 bg-blue-50/30 px-5 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100">
            <Check className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-sm font-medium text-slate-700">
            <span className="font-semibold text-blue-600">{vm.idsSelecionados.length}</span> colaboradores selecionados
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={vm.acaoLote} onValueChange={(valor) => vm.setAcaoLote(valor as "ATIVAR" | "INATIVAR" | "ALTERAR_CARGO" | "ALTERAR_PDV")}>
            <SelectTrigger className="h-10 w-full sm:w-[200px] rounded-xl border-slate-300 bg-white text-sm font-medium">
              <SelectValue placeholder="Acao" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ATIVAR">Ativar</SelectItem>
              <SelectItem value="INATIVAR">Inativar</SelectItem>
              <SelectItem value="ALTERAR_CARGO">Mudar cargo</SelectItem>
              <SelectItem value="ALTERAR_PDV">Mudar PDV</SelectItem>
            </SelectContent>
          </Select>

          <Button size="sm" className="rounded-xl bg-slate-800 font-medium text-white hover:bg-slate-700" onClick={() => void vm.executarAcaoLote()} disabled={vm.executandoLote || vm.idsSelecionados.length === 0}>
            {vm.executandoLote ? "Processando..." : "Aplicar"}
          </Button>
        </div>
      </div>

      {vm.acaoLote === "ALTERAR_CARGO" ? (
        <Select value={vm.cargoLote} onValueChange={vm.setCargoLote}>
          <SelectTrigger className="h-10 max-w-sm rounded-xl border-slate-300 bg-white text-sm">
            <SelectValue placeholder="Novo cargo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="COLABORADOR">COLABORADOR</SelectItem>
            <SelectItem value="GERENTE">GERENTE</SelectItem>
          </SelectContent>
        </Select>
      ) : null}

      {vm.acaoLote === "ALTERAR_PDV" ? (
        <Select value={vm.pdvLote} onValueChange={vm.setPdvLote}>
          <SelectTrigger className="h-10 max-w-sm rounded-xl border-slate-300 bg-white text-sm">
            <SelectValue placeholder="Novo PDV" />
          </SelectTrigger>
          <SelectContent>
            {vm.pdvs.map((pdv) => (
              <SelectItem key={pdv.id} value={pdv.id}>
                {pdv.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {vm.acaoLote === "INATIVAR" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <Select value={vm.destinoInativacaoLote} onValueChange={vm.setDestinoInativacaoLote}>
            <SelectTrigger className="h-10 rounded-xl border-slate-300 bg-white text-sm">
              <SelectValue placeholder="Destino para reatribuicao" />
            </SelectTrigger>
            <SelectContent>
              {vm.funcionariosAtivosParaDestino.map((funcionario) => (
                <SelectItem key={funcionario.id} value={funcionario.id}>
                  {funcionario.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            className="h-10 rounded-xl border-slate-300 bg-white"
            placeholder="Observacao (opcional)"
            value={vm.observacaoLote}
            onChange={(e) => vm.setObservacaoLote(e.target.value)}
          />
        </div>
      ) : null}

      {vm.erroLote ? <p className="text-sm font-medium text-rose-600">{vm.erroLote}</p> : null}
      {vm.resultadoLote ? <p className="text-sm text-slate-600">Atualizados: {vm.resultadoLote.atualizados} de {vm.resultadoLote.processados}.</p> : null}
    </section>
  );
}
