"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Flag, Loader2, Tag, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InlineStatusAlert } from "@/components/shared/inline-status-alert";
import { aplicaMascaraMoedaBr, converteMoedaBrParaNumero, formataMoeda } from "@/lib/utils";
import type { PeriodoMeta } from "@/lib/tipos";
import { criarFormularioInicial, formularioDaMeta, MEDICOES_META } from "@/modules/equipe/hooks/use-metas-module";
import type { MetaFormState, MetaMedicao, UseMetasModuleReturn } from "@/modules/equipe/types/metas";

type MetaCreationWizardProps = {
  vm: UseMetasModuleReturn;
};

function normalizarFimPorPeriodo(inicio: string, periodo: PeriodoMeta) {
  const base = new Date(`${inicio}T12:00:00`);
  const fim = new Date(base);

  if (periodo === "SEMANAL") {
    const dia = base.getDay() || 7;
    fim.setDate(base.getDate() + (7 - dia));
  } else if (periodo === "MENSAIS") {
    fim.setMonth(fim.getMonth() + 1);
    fim.setDate(fim.getDate() - 1);
  } else if (periodo === "TRIMESTRAL") {
    fim.setMonth(fim.getMonth() + 3);
    fim.setDate(fim.getDate() - 1);
  } else if (periodo === "ANUAL") {
    fim.setFullYear(fim.getFullYear() + 1);
    fim.setDate(fim.getDate() - 1);
  }

  const ano = fim.getFullYear();
  const mes = String(fim.getMonth() + 1).padStart(2, "0");
  const diaFim = String(fim.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${diaFim}`;
}

function formatarPeriodoCurto(data: string) {
  if (!data) return "-";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function MetaCreationWizard({ vm }: MetaCreationWizardProps) {
  const formularioInicial = useMemo(
    () => (vm.metaEmEdicao ? formularioDaMeta(vm.metaEmEdicao) : criarFormularioInicial(vm.pdvSelecionado)),
    [vm.metaEmEdicao, vm.pdvSelecionado],
  );
  const [formulario, setFormulario] = useState<MetaFormState>(formularioInicial);

  const alvoNumero = useMemo(() => converteMoedaBrParaNumero(formulario.alvo), [formulario.alvo]);
  const medicaoSelecionada = useMemo(
    () => MEDICOES_META.find((item) => item.value === formulario.medicao),
    [formulario.medicao],
  );
  const nomeEquipe = useMemo(
    () => vm.opcoesPdvs.find((pdv) => pdv.id === formulario.id_pdv)?.nome ?? "equipe selecionada",
    [formulario.id_pdv, vm.opcoesPdvs],
  );

  const podeSalvar = Boolean(formulario.id_pdv && formulario.data_inicio && formulario.data_fim && alvoNumero > 0);

  const atualizarCampo = <K extends keyof MetaFormState>(campo: K, valor: MetaFormState[K]) => {
    setFormulario((atual) => ({ ...atual, [campo]: valor }));
  };

  const handleSubmit = async () => {
    const payload: MetaFormState = {
      ...formulario,
      alvo: formulario.medicao === "VOLUME_FECHADOS" ? formulario.alvo.replace(/\D/g, "") : String(alvoNumero),
    };

    const ok = await vm.salvarMeta(payload);
    if (ok) {
      setFormulario(criarFormularioInicial(vm.pdvSelecionado));
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-5 text-white lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">Meta da equipe</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Uma tela curta para quem nao gosta de sistema complicado</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-200">
            Diga o titulo, escolha a equipe, defina o periodo e acompanhe o resultado sem configuracao tecnica.
          </p>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.14em] text-emerald-100">Como vai ficar</p>
          <div className="mt-3 space-y-3 text-sm text-slate-100">
            <div className="flex items-center gap-2"><Tag className="h-4 w-4 text-emerald-300" /> {formulario.titulo || "Defina um titulo"}</div>
            <div className="flex items-center gap-2"><Target className="h-4 w-4 text-emerald-300" /> {nomeEquipe}</div>
            <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-300" /> {medicaoSelecionada?.label ?? "Defina a medicao"}</div>
            <div className="flex items-center gap-2"><Target className="h-4 w-4 text-emerald-300" /> {formulario.medicao === "VOLUME_FECHADOS" ? `${formulario.alvo.replace(/\D/g, "") || "0"} contratos` : (alvoNumero > 0 ? formataMoeda(alvoNumero) : "Defina o valor da meta")}</div>
            <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-emerald-300" /> {formatarPeriodoCurto(formulario.data_inicio)} ate {formatarPeriodoCurto(formulario.data_fim)}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 md:col-span-2">
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Tag className="h-4 w-4 text-emerald-600" /> Titulo</span>
          <Input
            value={formulario.titulo}
            placeholder="Ex.: Semana 1, Fechamento de abril, Campanha premium"
            className="h-12 rounded-2xl border-slate-200 bg-white"
            onChange={(event) => atualizarCampo("titulo", event.target.value)}
          />
        </label>

        <label className="space-y-2 rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Flag className="h-4 w-4 text-emerald-600" /> Equipe</span>
          <Select value={formulario.id_pdv} onValueChange={(value) => atualizarCampo("id_pdv", value)}>
            <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white">
              <SelectValue placeholder="Selecione a equipe" />
            </SelectTrigger>
            <SelectContent>
              {vm.opcoesPdvs.map((pdv) => (
                <SelectItem key={pdv.id} value={pdv.id}>{pdv.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label className="space-y-2 rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Target className="h-4 w-4 text-emerald-600" /> Medicao</span>
          <Select value={formulario.medicao} onValueChange={(value) => atualizarCampo("medicao", value as MetaMedicao)}>
            <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEDICOES_META.map((medicao) => (
                <SelectItem key={medicao.value} value={medicao.value}>{medicao.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label className="space-y-2 rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-700"><CalendarDays className="h-4 w-4 text-emerald-600" /> Periodo</span>
          <Select value={formulario.periodo} onValueChange={(value) => {
            const periodo = value as PeriodoMeta;
            atualizarCampo("periodo", periodo);
            atualizarCampo("data_fim", normalizarFimPorPeriodo(formulario.data_inicio, periodo));
          }}>
            <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SEMANAL">Semanal</SelectItem>
              <SelectItem value="MENSAIS">Mensal</SelectItem>
              <SelectItem value="TRIMESTRAL">Trimestral</SelectItem>
              <SelectItem value="ANUAL">Anual</SelectItem>
              <SelectItem value="PERSONALIZADO">Livre</SelectItem>
            </SelectContent>
          </Select>
        </label>

        <label className="space-y-2 rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-700"><TrendingUp className="h-4 w-4 text-emerald-600" /> Alvo</span>
          <Input
            value={formulario.alvo}
            inputMode="numeric"
            placeholder={formulario.medicao === "VOLUME_FECHADOS" ? "Ex.: 12" : "Ex.: 25.000,00"}
            className="h-12 rounded-2xl border-slate-200 bg-white"
            onChange={(event) => {
              const valor = event.target.value;
              atualizarCampo(
                "alvo",
                formulario.medicao === "VOLUME_FECHADOS" ? valor.replace(/\D/g, "") : aplicaMascaraMoedaBr(valor),
              );
            }}
          />
          <p className="text-xs text-slate-500">
            {formulario.medicao === "VALOR_PAGAMENTOS"
              ? "Usa a soma dos pagamentos registrados no periodo escolhido."
              : formulario.medicao === "VALOR_FECHADOS"
                ? "Usa a soma do valor dos contratos fechados no periodo escolhido."
                : "Usa a quantidade de contratos fechados no periodo escolhido."}
          </p>
        </label>

        <div className="grid gap-4 rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700"><CalendarDays className="h-4 w-4 text-emerald-600" /> Inicio</span>
            <Input
              type="date"
              value={formulario.data_inicio}
            className="h-12 rounded-2xl border-slate-200 bg-white"
            onChange={(event) => {
              const inicio = event.target.value;
              atualizarCampo("data_inicio", inicio);
                if (formulario.periodo !== "PERSONALIZADO") {
                  atualizarCampo("data_fim", normalizarFimPorPeriodo(inicio, formulario.periodo));
                }
              }}
            />
          </label>

          <label className="space-y-2">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700"><CalendarDays className="h-4 w-4 text-emerald-600" /> Fim</span>
            <Input
              type="date"
              value={formulario.data_fim}
              className="h-12 rounded-2xl border-slate-200 bg-white"
              onChange={(event) => atualizarCampo("data_fim", event.target.value)}
            />
          </label>

          <div className="sm:col-span-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            O resultado considera os registros reais do periodo escolhido. Voce pode criar uma meta passada, atual ou futura.
          </div>
        </div>
      </div>

      <InlineStatusAlert variant="error" message={vm.erro} />

      <div className="flex flex-col gap-3 rounded-[24px] border border-emerald-100 bg-emerald-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-900">Resumo rapido</p>
          <p className="text-sm text-emerald-800/80">
            {formulario.titulo || "Esta meta"} de {nomeEquipe} precisa chegar em {formulario.medicao === "VOLUME_FECHADOS" ? `${formulario.alvo.replace(/\D/g, "") || "0"} contratos` : (alvoNumero > 0 ? formataMoeda(alvoNumero) : "um valor")} entre {formatarPeriodoCurto(formulario.data_inicio)} e {formatarPeriodoCurto(formulario.data_fim)}.
          </p>
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" className="rounded-2xl border-slate-200" onClick={vm.fecharDialog}>
            Cancelar
          </Button>
          <Button type="button" className="rounded-2xl bg-emerald-600 hover:bg-emerald-700" disabled={!podeSalvar || vm.salvando} onClick={() => void handleSubmit()}>
            {vm.salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {vm.metaEmEdicao ? "Salvar ajustes" : "Criar meta"}
          </Button>
        </div>
      </div>
    </div>
  );
}
