"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Loader2, Zap, Check, X } from "lucide-react";
import type { WhatsappInstancia, WhatsappAutomacao } from "../types";

type Props = {
  automacoes: WhatsappAutomacao[];
  instancias: WhatsappInstancia[];
  carregando: boolean;
  erro: string | null;
  onCriar: (data: {
    id_whatsapp_instancia: string;
    evento: string;
    telefone_destino: string;
    mensagem: string;
    ativo?: boolean;
  }) => Promise<void>;
  onAlternar: (id: string, ativo: boolean) => Promise<void>;
  onExcluir: (id: string) => Promise<void>;
};

export function AutomacoesList({
  automacoes,
  instancias,
  carregando,
  erro,
  onCriar,
  onAlternar,
  onExcluir,
}: Props) {
  const [abriForm, setabriForm] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [formErro, setFormErro] = useState<string | null>(null);

  const [instanciaId, setInstanciaId] = useState("");
  const [telefone, setTelefone] = useState("");
  const [mensagem, setMensagem] = useState("");

  const instanciaPorId = new Map(instancias.map((i) => [i.id, i]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instanciaId || !telefone || !mensagem) return;

    setEnviando(true);
    setFormErro(null);

    await onCriar({
      id_whatsapp_instancia: instanciaId,
      evento: "LEAD_STAGE_CHANGED",
      telefone_destino: telefone,
      mensagem,
    });

    setEnviando(false);
    setabriForm(false);
    setInstanciaId("");
    setTelefone("");
    setMensagem("");
  };

  const getNomeInstancia = (id: string) => {
    const inst = instanciaPorId.get(id);
    return inst?.nome ?? "Instância";
  };

  if (carregando) {
    return (
      <Card className="rounded-2xl border border-slate-200/60 bg-white">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border border-slate-200/60 bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
              <Zap className="h-4 w-4 text-amber-500" />
              Automações
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg border-slate-200 text-xs font-medium"
              onClick={() => setabriForm(!abriForm)}
            >
              {abriForm ? "Cancelar" : "+ Nova"}
            </Button>
          </div>
        </CardHeader>

        {abriForm && (
          <CardContent className="border-t border-slate-100 pt-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              {formErro && (
                <p className="text-sm text-rose-600">{formErro}</p>
              )}

              <div className="grid gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">
                    Instância WhatsApp
                  </label>
                  <select
                    className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    value={instanciaId}
                    onChange={(e) => setInstanciaId(e.target.value)}
                    required
                  >
                    <option value="">Selecione...</option>
                    {instancias.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.nome} {inst.phone ? `(${inst.phone})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600">
                    Número de destino
                  </label>
                  <Input
                    className="mt-1 h-9 rounded-lg border-slate-200 text-sm"
                    placeholder="+55 (11) 99999-9999"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600">
                    Mensagem
                  </label>
                  <textarea
                    className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    placeholder="Ex: Novo lead {{lead_nome}} mudou para {{estagio_novo}}"
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                    rows={3}
                    required
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    Variáveis: {"{{lead_nome}}"}, {"{{lead_telefone}}"},{" "}
                    {"{{estagio_anterior}}"}, {"{{estagio_novo}}"}
                  </p>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full rounded-lg bg-amber-500 text-sm font-medium text-white hover:bg-amber-600"
                disabled={enviando || !instanciaId || !telefone || !mensagem}
              >
                {enviando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Criar Automação"
                )}
              </Button>
            </form>
          </CardContent>
        )}
      </Card>

      {automacoes.length === 0 && !abriForm && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-6 text-center">
          <Zap className="mx-auto h-6 w-6 text-slate-300" />
          <p className="mt-2 text-sm text-slate-500">
            Nenhuma automação configurada
          </p>
          <p className="text-xs text-slate-400">
            Configure para receber alertas no WhatsApp
          </p>
        </div>
      )}

      {automacoes.map((automacao) => (
        <Card
          key={automacao.id}
          className="rounded-2xl border border-slate-200/60 bg-white"
        >
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-800">
                  {getNomeInstancia(automacao.id_whatsapp_instancia)}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    automacao.ativo
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {automacao.ativo ? "Ativo" : "Inativo"}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Envia para: {automacao.telefone_destino}
              </p>
              <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">
                {automacao.mensagem}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                  automacao.ativo
                    ? "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                    : "border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100"
                }`}
                onClick={() => onAlternar(automacao.id, !automacao.ativo)}
              >
                {automacao.ativo ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-rose-600"
                onClick={() => onExcluir(automacao.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
