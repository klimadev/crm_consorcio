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
      <div className="rounded-[24px] border border-border bg-muted p-4">
        <div className="rounded-[24px] border border-border bg-background-surface p-4 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.14em] text-foreground-muted">Como vai ficar</p>
          <div className="mt-3 space-y-3 text-sm text-foreground">
            <div className="flex items-center gap-2"><Tag className="h-4 w-4 text-success" /> {formulario.titulo || "Defina um titulo"}</div>
            <div className="flex items-center gap-2"><Target className="h-4 w-4 text-success" /> {nomeEquipe}</div>
            <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-success" /> {medicaoSelecionada?.label ?? "Defina a medicao"}</div>
            <div className="flex items-center gap-2"><Target className="h-4 w-4 text-success" /> {formulario.medicao === "VOLUME_FECHADOS" ? `${formulario.alvo.replace(/\D/g, "") || "0"} contratos` : (alvoNumero > 0 ? formataMoeda(alvoNumero) : "Defina o valor da meta")}</div>
            <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-success" /> {formatarPeriodoCurto(formulario.data_inicio)} ate {formatarPeriodoCurto(formulario.data_fim)}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 rounded-[24px] border border-border bg-muted p-4 md:col-span-2">
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground"><Tag className="h-4 w-4 text-success" /> Titulo</span>
          <Input
            value={formulario.titulo}
            placeholder="Ex.: Semana 1, Fechamento de abril, Campanha premium"
            className="h-12 rounded-2xl border-border bg-background-surface"
            onChange={(event) => atualizarCampo("titulo", event.target.value)}
          />
        </label>

        <label className="space-y-2 rounded-[24px] border border-border bg-muted p-4">
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground"><Flag className="h-4 w-4 text-success" /> Equipe</span>
          <Select value={formulario.id_pdv} onValueChange={(value) => atualizarCampo("id_pdv", value)}>
            <SelectTrigger className="h-12 rounded-2xl border-border bg-background-surface">
              <SelectValue placeholder="Selecione a equipe" />
            </SelectTrigger>
            <SelectContent>
              {vm.opcoesPdvs.map((pdv) => (
                <SelectItem key={pdv.id} value={pdv.id}>{pdv.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label className="space-y-2 rounded-[24px] border border-border bg-muted p-4">
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground"><Target className="h-4 w-4 text-success" /> Medicao</span>
          <Select value={formulario.medicao} onValueChange={(value) => atualizarCampo("medicao", value as MetaMedicao)}>
            <SelectTrigger className="h-12 rounded-2xl border-border bg-background-surface">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEDICOES_META.map((medicao) => (
                <SelectItem key={medicao.value} value={medicao.value}>{medicao.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label className="space-y-2 rounded-[24px] border border-border bg-muted p-4">
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground"><CalendarDays className="h-4 w-4 text-success" /> Periodo</span>
          <Select value={formulario.periodo} onValueChange={(value) => {
            const periodo = value as PeriodoMeta;
            atualizarCampo("periodo", periodo);
            atualizarCampo("data_fim", normalizarFimPorPeriodo(formulario.data_inicio, periodo));
          }}>
            <SelectTrigger className="h-12 rounded-2xl border-border bg-background-surface">
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

        <label className="space-y-2 rounded-[24px] border border-border bg-muted p-4">
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground"><TrendingUp className="h-4 w-4 text-success" /> Alvo</span>
          <Input
            value={formulario.alvo}
            inputMode="numeric"
            placeholder={formulario.medicao === "VOLUME_FECHADOS" ? "Ex.: 12" : "Ex.: 25.000,00"}
            className="h-12 rounded-2xl border-border bg-background-surface"
            onChange={(event) => {
              const valor = event.target.value;
              atualizarCampo(
                "alvo",
                formulario.medicao === "VOLUME_FECHADOS" ? valor.replace(/\D/g, "") : aplicaMascaraMoedaBr(valor),
              );
            }}
          />
          <p className="text-xs text-foreground-muted">
            {formulario.medicao === "VALOR_PAGAMENTOS"
              ? "Usa a soma dos pagamentos registrados no periodo escolhido."
              : formulario.medicao === "VALOR_FECHADOS"
                ? "Usa a soma do valor dos contratos fechados no periodo escolhido."
                : "Usa a quantidade de contratos fechados no periodo escolhido."}
          </p>
        </label>

        <div className="grid gap-4 rounded-[24px] border border-border bg-muted p-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground"><CalendarDays className="h-4 w-4 text-success" /> Inicio</span>
            <Input
              type="date"
              value={formulario.data_inicio}
            className="h-12 rounded-2xl border-border bg-background-surface"
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
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground"><CalendarDays className="h-4 w-4 text-success" /> Fim</span>
            <Input
              type="date"
              value={formulario.data_fim}
              className="h-12 rounded-2xl border-border bg-background-surface"
              onChange={(event) => atualizarCampo("data_fim", event.target.value)}
            />
          </label>

          <div className="sm:col-span-2 rounded-2xl border border-info/25 bg-info/10 px-4 py-3 text-sm text-foreground">
            O resultado considera os registros reais do periodo escolhido. Voce pode criar uma meta passada, atual ou futura.
          </div>
        </div>
      </div>

      <InlineStatusAlert variant="error" message={vm.erro} />

      <div className="flex flex-col gap-3 rounded-[24px] border border-success/25 bg-success/10 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Resumo rapido</p>
          <p className="text-sm text-foreground-muted">
            {formulario.titulo || "Esta meta"} de {nomeEquipe} precisa chegar em {formulario.medicao === "VOLUME_FECHADOS" ? `${formulario.alvo.replace(/\D/g, "") || "0"} contratos` : (alvoNumero > 0 ? formataMoeda(alvoNumero) : "um valor")} entre {formatarPeriodoCurto(formulario.data_inicio)} e {formatarPeriodoCurto(formulario.data_fim)}.
          </p>
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" className="rounded-2xl border-border" onClick={vm.fecharDialog}>
            Cancelar
          </Button>
          <Button type="button" className="rounded-2xl bg-success hover:bg-success/90" disabled={!podeSalvar || vm.salvando} onClick={() => void handleSubmit()}>
            {vm.salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {vm.metaEmEdicao ? "Salvar ajustes" : "Criar meta"}
          </Button>
        </div>
      </div>
    </div>
  );
}
