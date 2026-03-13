"use client";

import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, HelpCircle, Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip } from "@/components/ui/tooltip";
import { InlineStatusAlert } from "@/components/shared/inline-status-alert";
import { cn } from "@/lib/utils";
import type { MetaFormState, UseMetasModuleReturn } from "@/modules/equipe/types/metas";
import type { PeriodoMeta, TipoMeta, TipoMetaValor } from "@/lib/tipos";

// Opções de escopo com explicação visual
const OPCOES_ESCOPO = [
  {
    valor: "GLOBAL",
    titulo: "Empresa",
    subtitulo: "Meta para todos",
    descricao: "Uma meta que todos os PDVs e colaboradores vão acompanhar juntos",
    icone: "🏢",
    exemplo: "Ex: Faturar R$ 1 milhão no mês",
  },
  {
    valor: "PDV",
    titulo: "PDV / Loja",
    subtitulo: "Meta por unidade",
    descricao: "Uma meta específica para um ponto de venda (loja)",
    icone: "🏪",
    exemplo: "Ex: Loja Centro precisa vender R$ 100mil",
  },
  {
    valor: "INDIVIDUAL",
    titulo: "Colaborador",
    subtitulo: "Meta por pessoa",
    descricao: "Uma meta individual para um vendedor ou corretor",
    icone: "👤",
    exemplo: "Ex: João precisa fechar 10 contratos",
  },
] as const;

// Opções de indicador com exemplos
const OPCOES_INDICADOR = [
  {
    valor: "VALOR",
    titulo: "💰 Valor em reais",
    descricao: "Quanto dinheiro entrou",
    exemplo: "R$ 50.000,00",
  },
  {
    valor: "VOLUME",
    titulo: "📋 Quantidade",
    descricao: "Quantos contratos fechados",
    exemplo: "20 contratos",
  },
] as const;

// Opções de período com explicações
const OPCOES_PERIODO = [
  {
    valor: "MENSAIS",
    titulo: "📅 Mensal",
    descricao: "Para o mês atual",
  },
  {
    valor: "TRIMESTRAL",
    titulo: "📆 Trimestral",
    descricao: "Para 3 meses",
  },
  {
    valor: "ANUAL",
    titulo: "📊 Anual",
    descricao: "Para o ano todo",
  },
] as const;

type Passo = 1 | 2 | 3 | 4;

interface MetaCreationWizardProps {
  vm: UseMetasModuleReturn;
}

export function MetaCreationWizard({ vm }: MetaCreationWizardProps) {
  const [passo, setPasso] = useState<Passo>(1);
  const [formulario, setFormulario] = useState<FormularioWizard>({
    tipo: vm.tipoCriacao || "GLOBAL",
    tipo_meta: "VALOR",
    alvo: "",
    periodo: "MENSAIS",
    data_inicio: new Date().toISOString().slice(0, 10),
    data_fim: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10),
    id_pdv: "",
    id_funcionario: "",
  });

  const podeAvancar = useCallback(() => {
    switch (passo) {
      case 1:
        return !!formulario.tipo;
      case 2:
        return !!formulario.tipo_meta;
      case 3:
        return !!formulario.alvo && Number(formulario.alvo) > 0;
      case 4:
        if (formulario.tipo === "PDV") return !!formulario.id_pdv;
        if (formulario.tipo === "INDIVIDUAL") return !!formulario.id_funcionario;
        return true;
      default:
        return false;
    }
  }, [passo, formulario]);

  const irParaPasso = (novoPasso: Passo) => {
    if (novoPasso > passo && !podeAvancar()) return;
    setPasso(novoPasso);
  };

  const atualizar = <K extends keyof typeof formulario>(campo: K, valor: (typeof formulario)[K]) => {
    setFormulario((atual) => ({ ...atual, [campo]: valor }));
  };

  const handleSubmit = async () => {
    const payload: MetaFormState = {
      tipo: formulario.tipo,
      tipo_meta: formulario.tipo_meta,
      alvo: formulario.alvo,
      periodo: formulario.periodo as PeriodoMeta,
      data_inicio: formulario.data_inicio,
      data_fim: formulario.data_fim,
      id_pdv: formulario.id_pdv,
      id_funcionario: formulario.id_funcionario,
    };
    await vm.salvarMeta(payload);
  };

  const titulosPassos = {
    1: { principal: "Para quem é esta meta?", secundario: "Escolha quem vai acompanhar essa meta" },
    2: { principal: "O que você quer medir?", secundario: "Selecione o indicador principal" },
    3: { principal: "Qual é a meta?", secundario: "Defina a quantidade ou valor alvo" },
    4: { principal: "Quando?", secundario: "Escolha o período de vigência" },
  };

  return (
    <div className="space-y-6">
      {/* Header do Wizard */}
      <div className="text-center">
        <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-xl">
          <Sparkles className="h-5 w-5 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">{titulosPassos[passo].principal}</h2>
        <p className="mt-1 text-sm text-slate-500">{titulosPassos[passo].secundario}</p>
      </div>

      {/* Indicador de progresso */}
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4].map((p) => (
          <div
            key={p}
            className={cn(
              "h-2 w-8 rounded-full transition-all",
              p === passo ? "bg-emerald-500 w-12" : p < passo ? "bg-emerald-200" : "bg-slate-200"
            )}
          />
        ))}
      </div>

      {/* Conteúdo do passo */}
      <div className="min-h-[320px]">
        {passo === 1 && (
          <PassoEscopo
            valor={formulario.tipo}
            onChange={(v) => atualizar("tipo", v)}
            podeCriarGlobal={vm.podeCriarGlobal}
            podeCriarMetaPdv={vm.podeCriarMetaPdv}
            podeCriarMetaIndividual={vm.podeCriarMetaIndividual}
          />
        )}

        {passo === 2 && (
          <PassoIndicador valor={formulario.tipo_meta} onChange={(v) => atualizar("tipo_meta", v)} />
        )}

        {passo === 3 && (
          <PassoAlvo
            tipo_meta={formulario.tipo_meta}
            alvo={formulario.alvo}
            onChange={(v) => atualizar("alvo", v)}
          />
        )}

        {passo === 4 && (
          <PassoPeriodo
            formulario={formulario}
            onChange={atualizar}
            opcoesPdvs={vm.opcoesPdvs}
            opcoesColaboradores={vm.opcoesColaboradores}
          />
        )}
      </div>

      {/* Erro */}
      <InlineStatusAlert variant="error" message={vm.erro} />

      {/* Navegação */}
      <div className="flex justify-between pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => irParaPasso((passo - 1) as Passo)}
          disabled={passo === 1}
          className="rounded-xl"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Voltar
        </Button>

        {passo < 4 ? (
          <Button
            type="button"
            onClick={() => irParaPasso((passo + 1) as Passo)}
            disabled={!podeAvancar()}
            className="rounded-xl"
          >
            Continuar
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!podeAvancar() || vm.salvando}
            className="rounded-xl"
          >
            {vm.salvando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Criar Meta
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================
// PASSO 1: Escolha do Escopo
// ============================================
function PassoEscopo({
  valor,
  onChange,
  podeCriarGlobal,
  podeCriarMetaPdv,
  podeCriarMetaIndividual,
}: {
  valor: string;
  onChange: (v: "GLOBAL" | "PDV" | "INDIVIDUAL") => void;
  podeCriarGlobal: boolean;
  podeCriarMetaPdv: boolean;
  podeCriarMetaIndividual: boolean;
}) {
  const opcoes = OPCOES_ESCOPO.filter((op) => {
    if (op.valor === "GLOBAL") return podeCriarGlobal;
    if (op.valor === "PDV") return podeCriarMetaPdv;
    if (op.valor === "INDIVIDUAL") return podeCriarMetaIndividual;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {opcoes.map((op) => (
          <button
            key={op.valor}
            type="button"
            onClick={() => onChange(op.valor as "GLOBAL" | "PDV" | "INDIVIDUAL")}
            className={cn(
              "flex items-start gap-4 rounded-2xl border-2 p-4 text-left transition-all hover:border-emerald-300 hover:bg-emerald-50/50",
              valor === op.valor
                ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200 ring-offset-2"
                : "border-slate-200 bg-white"
            )}
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-2xl">
              {op.icone}
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">{op.titulo}</span>
                <span className="text-xs text-slate-400">({op.subtitulo})</span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{op.descricao}</p>
              <p className="mt-2 text-xs font-medium text-emerald-600">{op.exemplo}</p>
            </div>
            {valor === op.valor && <Check className="h-5 w-5 shrink-0 text-emerald-500" />}
          </button>
        ))}
      </div>

      <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
        <div className="flex items-start gap-2">
          <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Não sabe qual escolher?</p>
            <p className="mt-1 text-blue-600">
              Comece com <strong>&quot;Empresa&quot;</strong> se quiser definir uma meta geral. Depois voce pode criar metas
              especificas para cada loja ou pessoa.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// PASSO 2: Escolha do Indicador
// ============================================
function PassoIndicador({
  valor,
  onChange,
}: {
  valor: "VALOR" | "VOLUME";
  onChange: (v: "VALOR" | "VOLUME") => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {OPCOES_INDICADOR.map((op) => (
          <button
            key={op.valor}
            type="button"
            onClick={() => onChange(op.valor as "VALOR" | "VOLUME")}
            className={cn(
              "flex items-start gap-4 rounded-2xl border-2 p-4 text-left transition-all hover:border-emerald-300 hover:bg-emerald-50/50",
              valor === op.valor
                ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200 ring-offset-2"
                : "border-slate-200 bg-white"
            )}
          >
            <div className="flex-1">
              <span className="font-semibold text-slate-900">{op.titulo}</span>
              <p className="mt-1 text-sm text-slate-600">{op.descricao}</p>
              <p className="mt-2 text-xs font-medium text-emerald-600">Exemplo: {op.exemplo}</p>
            </div>
            {valor === op.valor && <Check className="h-5 w-5 shrink-0 text-emerald-500" />}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================
// PASSO 3: Definição do Alvo
// ============================================
function PassoAlvo({
  tipo_meta,
  alvo,
  onChange,
}: {
  tipo_meta: "VALOR" | "VOLUME";
  alvo: string;
  onChange: (v: string) => void;
}) {
  const indicador = OPCOES_INDICADOR.find((i) => i.valor === tipo_meta);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-slate-50 p-4">
        <p className="text-sm text-slate-600">
          Você está criando uma meta de{" "}
          <span className="font-semibold text-slate-900">
            {tipo_meta === "VALOR" ? "valor em reais" : "quantidade de contratos"}
          </span>
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">
          Qual é a meta?
          <Tooltip content={indicador?.descricao || ""}>
            <HelpCircle className="ml-1 h-4 w-4 text-slate-400" />
          </Tooltip>
        </label>
        <div className="relative">
          {tipo_meta === "VALOR" && (
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">R$</span>
          )}
          <Input
            type="number"
            step={tipo_meta === "VALOR" ? "0.01" : "1"}
            min="0"
            value={alvo}
            onChange={(e) => onChange(e.target.value)}
            placeholder={tipo_meta === "VALOR" ? "50.000" : "20"}
            className={cn("text-lg", tipo_meta === "VALOR" && "pl-10")}
          />
          {tipo_meta === "VOLUME" && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">contratos</span>
          )}
        </div>
      </div>

      {alvo && Number(alvo) > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-700">
            <Check className="mr-1 inline h-4 w-4" />
           .Meta de{" "}
            <span className="font-semibold">
              {tipo_meta === "VALOR"
                ? `R$ ${Number(alvo).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                : `${alvo} contratos`}
            </span>
          </p>
        </div>
      )}

      <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
        <p className="font-medium">💡 Dica</p>
        <p className="mt-1 text-amber-600">
          Comece com um valor que sua equipe consegue atingir. Você pode aumentar gradualmente quando eles
          ficarem mais confortáveis.
        </p>
      </div>
    </div>
  );
}

// ============================================
// PASSO 4: Período e Destinatário (se aplicável)
// ============================================
type FormularioWizard = {
  tipo: TipoMeta;
  tipo_meta: TipoMetaValor;
  alvo: string;
  periodo: PeriodoMeta;
  data_inicio: string;
  data_fim: string;
  id_pdv: string;
  id_funcionario: string;
};

function PassoPeriodo({
  formulario,
  onChange,
  opcoesPdvs,
  opcoesColaboradores,
}: {
  formulario: FormularioWizard;
  onChange: (campo: keyof FormularioWizard, valor: string) => void;
  opcoesPdvs: { id: string; nome: string }[];
  opcoesColaboradores: { id: string; nome: string; nome_pdv: string }[];
}) {
  return (
    <div className="space-y-6">
      {/* Escolha do período */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-slate-700">Por quanto tempo?</label>
        <div className="grid grid-cols-3 gap-3">
          {OPCOES_PERIODO.map((op) => (
            <button
              key={op.valor}
              type="button"
              onClick={() => {
                onChange("periodo", op.valor);
                // Ajustar datas baseado no período
                const hoje = new Date();
                let fim: Date;
                if (op.valor === "MENSAIS") {
                  fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
                } else if (op.valor === "TRIMESTRAL") {
                  fim = new Date(hoje.getFullYear(), hoje.getMonth() + 3, 0);
                } else {
                  fim = new Date(hoje.getFullYear() + 1, hoje.getMonth(), hoje.getDate());
                }
                onChange("data_inicio", hoje.toISOString().slice(0, 10));
                onChange("data_fim", fim.toISOString().slice(0, 10));
              }}
              className={cn(
                "flex flex-col items-center rounded-xl border-2 p-4 transition-all hover:border-emerald-300",
                formulario.periodo === op.valor
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-slate-200 bg-white"
              )}
            >
              <span className="text-lg font-semibold text-slate-900">{op.titulo}</span>
              <span className="mt-1 text-xs text-slate-500">{op.descricao}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Datas */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">De</label>
          <Input
            type="date"
            value={formulario.data_inicio}
            onChange={(e) => onChange("data_inicio", e.target.value)}
            className="rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Ate</label>
          <Input
            type="date"
            value={formulario.data_fim}
            onChange={(e) => onChange("data_fim", e.target.value)}
            className="rounded-xl"
          />
        </div>
      </div>

      {/* Seleção de PDV (se aplicável) */}
      {formulario.tipo === "PDV" && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Qual loja?</label>
          <Select value={formulario.id_pdv} onValueChange={(v) => onChange("id_pdv", v)}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Selecione a loja" />
            </SelectTrigger>
            <SelectContent>
              {opcoesPdvs.map((pdv) => (
                <SelectItem key={pdv.id} value={pdv.id}>
                  {pdv.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Seleção de Colaborador (se aplicável) */}
      {formulario.tipo === "INDIVIDUAL" && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Para quem?</label>
          <Select value={formulario.id_funcionario} onValueChange={(v) => onChange("id_funcionario", v)}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Selecione o colaborador" />
            </SelectTrigger>
            <SelectContent>
              {opcoesColaboradores.map((colab) => (
                <SelectItem key={colab.id} value={colab.id}>
                  {colab.nome} ({colab.nome_pdv})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Resumo */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-700">Resumo da meta</p>
        <ul className="mt-2 space-y-1 text-sm text-slate-600">
          <li>
            •{" "}
            {formulario.tipo === "GLOBAL"
              ? "Para toda a empresa"
              : formulario.tipo === "PDV"
                ? `Para: ${opcoesPdvs.find((p) => p.id === formulario.id_pdv)?.nome || "..."}`
                : `Para: ${opcoesColaboradores.find((c) => c.id === formulario.id_funcionario)?.nome || "..."}`}
          </li>
          <li>• Período: {new Date(formulario.data_inicio).toLocaleDateString("pt-BR")} até {new Date(formulario.data_fim).toLocaleDateString("pt-BR")}</li>
        </ul>
      </div>
    </div>
  );
}
