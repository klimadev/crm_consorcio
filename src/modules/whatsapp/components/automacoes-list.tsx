"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Loader2, Zap, Check, X, Plus, Clock3 } from "lucide-react";
import { criarContextoPreviewWhatsapp, renderizarTemplateWhatsapp } from "@/lib/whatsapp-template";
import type {
  WhatsappInstancia,
  WhatsappAutomacao,
  EstagioFunilOption,
  WhatsappAutomacaoCreateInput,
  WhatsappFollowUpDispatchResultado,
} from "../types";

type EtapaForm = {
  ordem: number;
  delay_horas: number;
  delay_minutos: number;
  mensagem_template: string;
};

const VARIAVEIS = [
  "{{lead_nome}}",
  "{{lead_telefone}}",
  "{{lead_id}}",
  "{{estagio_anterior}}",
  "{{estagio_novo}}",
] as const;

type Props = {
  automacoes: WhatsappAutomacao[];
  instancias: WhatsappInstancia[];
  carregando: boolean;
  erro: string | null;
  onCriar: (data: WhatsappAutomacaoCreateInput) => Promise<void>;
  onPreview: (mensagem: string) => Promise<string | null>;
  onDispararDispatch: (limite?: number) => Promise<WhatsappFollowUpDispatchResultado | null>;
  onAlternar: (id: string, ativo: boolean) => Promise<void>;
  onExcluir: (id: string) => Promise<void>;
};

export function AutomacoesList({
  automacoes,
  instancias,
  carregando,
  erro,
  onCriar,
  onPreview,
  onDispararDispatch,
  onAlternar,
  onExcluir,
}: Props) {
  const [abriForm, setAbriForm] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [formErro, setFormErro] = useState<string | null>(null);
  const [previewServidor, setPreviewServidor] = useState<string | null>(null);
  const [dispatchExecutando, setDispatchExecutando] = useState(false);
  const [dispatchResultado, setDispatchResultado] = useState<WhatsappFollowUpDispatchResultado | null>(null);
  const [estagios, setEstagios] = useState<EstagioFunilOption[]>([]);

  const [instanciaId, setInstanciaId] = useState("");
  const [evento, setEvento] = useState<"LEAD_STAGE_CHANGED" | "LEAD_FOLLOW_UP">("LEAD_STAGE_CHANGED");
  const [tipoDestino, setTipoDestino] = useState<"FIXO" | "LEAD_TELEFONE">("LEAD_TELEFONE");
  const [idEstagioDestino, setIdEstagioDestino] = useState("");
  const [telefone, setTelefone] = useState("");
  const [mensagemPrincipal, setMensagemPrincipal] = useState("");
  const [etapas, setEtapas] = useState<EtapaForm[]>([
    { ordem: 1, delay_horas: 1, delay_minutos: 0, mensagem_template: "" },
  ]);

  const instanciaPorId = new Map(instancias.map((i) => [i.id, i]));

  useEffect(() => {
    let ativo = true;

    const carregarEstagios = async () => {
      const resposta = await fetch("/api/estagios");
      const json = await resposta.json().catch(() => ({}));
      if (!resposta.ok || !ativo) {
        return;
      }
      setEstagios(Array.isArray(json.estagios) ? json.estagios : []);
    };

    void carregarEstagios();

    return () => {
      ativo = false;
    };
  }, []);

  const limparFeedback = () => {
    setPreviewServidor(null);
    setFormErro(null);
  };

  const contextoPreview = useMemo(
    () =>
      criarContextoPreviewWhatsapp({
        estagio_novo:
          estagios.find((item) => item.id === idEstagioDestino)?.nome ?? "FollowUp",
      }),
    [estagios, idEstagioDestino],
  );

  const previewLocalPrincipal = renderizarTemplateWhatsapp(mensagemPrincipal, contextoPreview);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instanciaId) return;
    if (tipoDestino === "FIXO" && !telefone.trim()) {
      setFormErro("Informe o numero de destino.");
      return;
    }
    if (evento === "LEAD_STAGE_CHANGED" && !mensagemPrincipal.trim()) {
      setFormErro("Mensagem obrigatoria para automacao imediata.");
      return;
    }
    if (evento === "LEAD_FOLLOW_UP" && etapas.some((etapa) => !etapa.mensagem_template.trim())) {
      setFormErro("Preencha todas as mensagens da timeline.");
      return;
    }

    setEnviando(true);
    setFormErro(null);

    const payload: WhatsappAutomacaoCreateInput = {
      id_whatsapp_instancia: instanciaId,
      evento,
      tipo_destino: tipoDestino,
      id_estagio_destino: idEstagioDestino || undefined,
      telefone_destino: tipoDestino === "FIXO" ? telefone : undefined,
      mensagem: evento === "LEAD_STAGE_CHANGED" ? mensagemPrincipal : undefined,
      etapas:
        evento === "LEAD_FOLLOW_UP"
          ? etapas.map((etapa, index) => ({
              ordem: index + 1,
              delay_minutos: Math.max(1, (etapa.delay_horas * 60) + etapa.delay_minutos),
              mensagem_template: etapa.mensagem_template,
            }))
          : undefined,
    };

    await onCriar(payload);

    setEnviando(false);
    setAbriForm(false);
    setInstanciaId("");
    setEvento("LEAD_STAGE_CHANGED");
    setTipoDestino("LEAD_TELEFONE");
    setIdEstagioDestino("");
    setTelefone("");
    setMensagemPrincipal("");
    setEtapas([{ ordem: 1, delay_horas: 1, delay_minutos: 0, mensagem_template: "" }]);
  };

  const adicionarEtapa = () => {
    limparFeedback();
    setEtapas((atual) => [
      ...atual,
      { ordem: atual.length + 1, delay_horas: 1, delay_minutos: 0, mensagem_template: "" },
    ]);
  };

  const atualizarEtapa = (index: number, dados: Partial<EtapaForm>) => {
    limparFeedback();
    setEtapas((atual) => atual.map((item, i) => (i === index ? { ...item, ...dados } : item)));
  };

  const removerEtapa = (index: number) => {
    limparFeedback();
    setEtapas((atual) => {
      if (atual.length <= 1) {
        return atual;
      }
      return atual
        .filter((_, i) => i !== index)
        .map((item, i) => ({ ...item, ordem: i + 1 }));
    });
  };

  const inserirVariavel = (variavel: string) => {
    limparFeedback();
    if (evento === "LEAD_STAGE_CHANGED") {
      setMensagemPrincipal((atual) => `${atual}${variavel}`);
      return;
    }

    setEtapas((atual) => {
      if (!atual.length) {
        return atual;
      }
      return atual.map((item, index) =>
        index === atual.length - 1
          ? { ...item, mensagem_template: `${item.mensagem_template}${variavel}` }
          : item,
      );
    });
  };

  const gerarPreviewServidor = async () => {
    if (evento !== "LEAD_STAGE_CHANGED" || !mensagemPrincipal.trim()) {
      return;
    }

    const preview = await onPreview(mensagemPrincipal);
    setPreviewServidor(preview);
  };

  const dispararDispatch = async () => {
    setDispatchExecutando(true);
    const resultado = await onDispararDispatch(50);
    setDispatchResultado(resultado);
    setDispatchExecutando(false);
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
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-lg border-slate-200 text-xs font-medium"
                onClick={dispararDispatch}
                disabled={dispatchExecutando}
              >
                {dispatchExecutando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Processar follow-ups"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-lg border-slate-200 text-xs font-medium"
                onClick={() => setAbriForm(!abriForm)}
              >
                {abriForm ? "Cancelar" : "+ Nova"}
              </Button>
            </div>
          </div>
        </CardHeader>

        {dispatchResultado && (
          <CardContent className="border-t border-slate-100 pt-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
              <p className="text-xs font-semibold text-slate-700">
                Dispatch executado ({dispatchResultado.runId})
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Processados: {dispatchResultado.processados} | Enviados: {dispatchResultado.enviados} | Falhas: {dispatchResultado.falhas}
              </p>
              {dispatchResultado.detalhes.length > 0 && (
                <div className="mt-2 space-y-1">
                  {dispatchResultado.detalhes.slice(0, 5).map((detalhe) => (
                    <p key={detalhe.agendamentoId} className="text-[11px] text-slate-500">
                      {detalhe.statusFinal} | lead={detalhe.leadId} | tentativa={detalhe.tentativa}
                      {detalhe.telefoneE164 ? ` | ${detalhe.telefoneE164}` : ""}
                      {detalhe.erro ? ` | erro=${detalhe.erro}` : ""}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        )}

        {abriForm && (
          <CardContent className="border-t border-slate-100 pt-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              {formErro && (
                <p className="text-sm text-rose-600">{formErro}</p>
              )}
              {erro && <p className="text-sm text-rose-600">{erro}</p>}

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
                  <label className="text-xs font-medium text-slate-600">Evento</label>
                  <select
                    className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    value={evento}
                    onChange={(e) => {
                      limparFeedback();
                      setEvento(e.target.value as "LEAD_STAGE_CHANGED" | "LEAD_FOLLOW_UP");
                    }}
                    required
                  >
                    <option value="LEAD_STAGE_CHANGED">Mudança de estágio (imediata)</option>
                    <option value="LEAD_FOLLOW_UP">Follow-up por timeline</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600">Filtrar por estágio (opcional)</label>
                  <select
                    className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    value={idEstagioDestino}
                    onChange={(e) => {
                      limparFeedback();
                      setIdEstagioDestino(e.target.value);
                    }}
                  >
                    <option value="">Todos os estágios</option>
                    {estagios.map((estagio) => (
                      <option key={estagio.id} value={estagio.id}>
                        {estagio.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600">Destino</label>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                        tipoDestino === "LEAD_TELEFONE"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                      onClick={() => {
                        limparFeedback();
                        setTipoDestino("LEAD_TELEFONE");
                      }}
                    >
                      Telefone do lead
                    </button>
                    <button
                      type="button"
                      className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                        tipoDestino === "FIXO"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                      onClick={() => {
                        limparFeedback();
                        setTipoDestino("FIXO");
                      }}
                    >
                      Número específico
                    </button>
                  </div>
                </div>

                {tipoDestino === "FIXO" && (
                  <div>
                    <label className="text-xs font-medium text-slate-600">Número de destino</label>
                    <Input
                      className="mt-1 h-9 rounded-lg border-slate-200 text-sm"
                      placeholder="+55 (11) 99999-9999"
                      value={telefone}
                      onChange={(e) => {
                        limparFeedback();
                        setTelefone(e.target.value);
                      }}
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-slate-600">Variáveis</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {VARIAVEIS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100"
                        onClick={() => inserirVariavel(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                {evento === "LEAD_STAGE_CHANGED" ? (
                  <div>
                    <label className="text-xs font-medium text-slate-600">Mensagem</label>
                    <textarea
                      className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                      placeholder="Ex: Novo lead {{lead_nome}} mudou para {{estagio_novo}}"
                      value={mensagemPrincipal}
                      onChange={(e) => {
                        limparFeedback();
                        setMensagemPrincipal(e.target.value);
                      }}
                      rows={3}
                      required
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-600">Timeline de follow-up</label>
                      <Button type="button" variant="outline" size="sm" onClick={adicionarEtapa}>
                        <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar etapa
                      </Button>
                    </div>
                    {etapas.map((etapa, index) => (
                      <div key={index} className="rounded-lg border border-slate-200 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-xs font-semibold text-slate-700">Etapa {index + 1}</p>
                          <button
                            type="button"
                            className="text-xs text-rose-600 disabled:text-slate-300"
                            onClick={() => removerEtapa(index)}
                            disabled={etapas.length <= 1}
                          >
                            Remover
                          </button>
                        </div>

                        <div className="mb-2 grid gap-2 sm:grid-cols-2">
                          <div>
                            <label className="text-[11px] text-slate-500">Ordem</label>
                            <Input
                              type="number"
                              min={1}
                              value={index + 1}
                              disabled
                              className="mt-1 h-8 rounded-md border-slate-200 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-500">Enviar após</label>
                            <div className="mt-1 flex items-center gap-1">
                              <div className="flex-1">
                                <Input
                                  type="number"
                                  min={0}
                                  max={99}
                                  value={etapa.delay_horas}
                                  className="h-8 rounded-md border-slate-200 text-center text-xs"
                                  placeholder="1"
                                  onChange={(e) => {
                                    limparFeedback();
                                    atualizarEtapa(index, {
                                      delay_horas: Math.max(0, Math.min(99, Number(e.target.value || 0))),
                                    });
                                  }}
                                />
                                <p className="text-[10px] text-slate-400 text-center">horas</p>
                              </div>
                              <span className="text-slate-400">:</span>
                              <div className="flex-1">
                                <Input
                                  type="number"
                                  min={0}
                                  max={59}
                                  value={etapa.delay_minutos}
                                  className="h-8 rounded-md border-slate-200 text-center text-xs"
                                  placeholder="0"
                                  onChange={(e) => {
                                    limparFeedback();
                                    atualizarEtapa(index, {
                                      delay_minutos: Math.max(0, Math.min(59, Number(e.target.value || 0))),
                                    });
                                  }}
                                />
                                <p className="text-[10px] text-slate-400 text-center">min</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <textarea
                          className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                          placeholder="Mensagem desta etapa"
                          value={etapa.mensagem_template}
                          onChange={(e) => {
                            limparFeedback();
                            atualizarEtapa(index, { mensagem_template: e.target.value });
                          }}
                          rows={3}
                        />
                        <p className="mt-1 text-[11px] text-slate-500">
                          Prévia: {renderizarTemplateWhatsapp(etapa.mensagem_template, contextoPreview) || "-"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {evento === "LEAD_STAGE_CHANGED" && (
                  <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-3">
                    <p className="text-xs font-semibold text-amber-700">Preview</p>
                    <p className="mt-1 text-xs text-amber-800">{previewLocalPrincipal || "-"}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={gerarPreviewServidor}>
                        Gerar preview validado
                      </Button>
                      {previewServidor && (
                        <p className="text-xs text-slate-600">Servidor: {previewServidor}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full rounded-lg bg-amber-500 text-sm font-medium text-white hover:bg-amber-600"
                disabled={
                  enviando ||
                  !instanciaId ||
                  (tipoDestino === "FIXO" && !telefone.trim()) ||
                  (evento === "LEAD_STAGE_CHANGED" && !mensagemPrincipal.trim())
                }
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
                Evento: {automacao.evento === "LEAD_STAGE_CHANGED" ? "Mudança de estágio" : "Follow-up"}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Destino: {automacao.tipo_destino === "FIXO" ? automacao.telefone_destino : "Telefone do lead"}
              </p>
              {automacao.evento === "LEAD_FOLLOW_UP" ? (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                  <Clock3 className="h-3.5 w-3.5" />
                  {automacao.etapas?.length ?? 0} etapas na timeline
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">{automacao.mensagem}</p>
              )}
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
