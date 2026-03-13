import { Button } from "@/components/ui/button";
import { Plus, Sparkles, Target, List } from "lucide-react";
import type { UseMetasModuleReturn } from "@/modules/equipe/types/metas";
import { MetaFormDialog } from "./meta-form-dialog";
import { MetasKPIHeader } from "./metas-kpi-header";
import { MetaCardCompact } from "./meta-card-compact";
import { RankingWidget } from "./ranking-widget";
import { formatarIndicadorMeta } from "./utils";
import { cn } from "@/lib/utils";
import type { MetaModuleItem } from "@/modules/equipe/types/metas";

type MetaAdminPanelProps = {
  vm: UseMetasModuleReturn;
};

type MetaComTipo = MetaModuleItem & { tipoDisplay: "global" | "pdv" | "individual" };

// ============================================
// Estado Vazio Educativo - Guia o usuário para o wizard
// ============================================
function EstadoVazioEducativo({ vm }: { vm: UseMetasModuleReturn }) {
  const podeAlgumaMeta = vm.podeCriarGlobal || vm.podeCriarMetaPdv || vm.podeCriarMetaIndividual;

  if (!podeAlgumaMeta) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-slate-300" />
        <h3 className="mt-3 text-lg font-semibold text-slate-900">Sem permissão para criar metas</h3>
        <p className="mt-2 text-sm text-slate-500">Entre em contato com um administrador para criar metas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner de boas-vindas */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-600 px-6 py-8 text-white">
        <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-white/10" />
        <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-white/10" />
        
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Bem-vindo ao Painel de Metas!</h2>
              <p className="text-emerald-100">Vamos criar sua primeira meta?</p>
            </div>
          </div>
          
          <p className="mt-4 max-w-xl text-sm text-emerald-50">
            Metas ajudam sua equipe a entender o que precisam atingir. 
            É só responder algumas perguntas simples e pronto!
          </p>
          
          <Button 
            onClick={() => vm.abrirNovaMeta()}
            className="mt-6 bg-white text-emerald-600 hover:bg-emerald-50"
          >
            <Plus className="mr-2 h-4 w-4" />
            Criar minha primeira meta
          </Button>
        </div>
      </div>

      {/* Info rápida sobre o wizard */}
      <div className="rounded-2xl bg-slate-50 p-5">
        <h3 className="font-semibold text-slate-900">Como funciona?</h3>
        <p className="mt-1 text-sm text-slate-600">
          O wizard vai fazer algumas perguntas simples: para quem é a meta, o que medir, qual o objetivo e quando. 
          É rápido e fácil!
        </p>
      </div>
    </div>
  );
}

function EstadoVazio({ titulo, descricao, acao, icone: Icone }: { titulo: string; descricao: string; acao?: () => void; icone?: React.ElementType }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
      {Icone && <Icone className="mx-auto h-8 w-8 text-slate-300" />}
      <h3 className="mt-3 text-lg font-semibold text-slate-900">{titulo}</h3>
      <p className="mt-2 text-sm text-slate-500">{descricao}</p>
      {acao && (
        <Button onClick={acao} variant="outline" className="mt-4 rounded-xl">
          <Plus className="mr-2 h-4 w-4" />
          Criar agora
        </Button>
      )}
    </div>
  );
}

// ============================================
// Componente Principal
// ============================================
export function MetaAdminPanel({ vm }: MetaAdminPanelProps) {
  const metasGlobaisAtivas = vm.metasGlobais.filter((meta) => meta.ativo);
  const metasPdvAtivas = vm.metasPdv.filter((meta) => meta.ativo);
  const metasIndividuaisAtivas = vm.metasIndividuais.filter((meta) => meta.ativo);
  
  const semMetas = metasGlobaisAtivas.length === 0 && metasPdvAtivas.length === 0 && metasIndividuaisAtivas.length === 0;

  // Calcular KPIs
  const kpis = {
    totalAtivas: metasGlobaisAtivas.length + metasPdvAtivas.length + metasIndividuaisAtivas.length,
    mediaGeral: calcularMediaGeral(),
    emRisco: calcularEmRisco(),
    concluidas: calcularConcluidas(),
  };

  function calcularMediaGeral() {
    const todas = [
      ...metasGlobaisAtivas,
      ...metasPdvAtivas,
      ...metasIndividuaisAtivas,
    ];
    if (todas.length === 0) return 0;
    const soma = todas.reduce((acc, meta) => acc + (meta.progresso?.percentual ?? 0), 0);
    return soma / todas.length;
  }

  function calcularEmRisco() {
    const todas = [
      ...metasGlobaisAtivas,
      ...metasPdvAtivas,
      ...metasIndividuaisAtivas,
    ];
    return todas.filter(meta => (meta.progresso?.percentual ?? 0) < 50).length;
  }

  function calcularConcluidas() {
    const todas = [
      ...metasGlobaisAtivas,
      ...metasPdvAtivas,
      ...metasIndividuaisAtivas,
    ];
    return todas.filter(meta => (meta.progresso?.percentual ?? 0) >= 100).length;
  }

  // Loading state
  if (vm.carregando) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-3xl bg-white" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      </div>
    );
  }

  // Se não há metas, mostrar wizard educativo
  if (semMetas) {
    return (
      <>
        <EstadoVazioEducativo vm={vm} />
        <MetaFormDialog vm={vm} />
      </>
    );
  }

  // Consolidar todas as metas para visualização em lista única
  const todasMetas = [
    ...metasGlobaisAtivas.map(m => ({ ...m, tipoDisplay: "global" as const })),
    ...metasPdvAtivas.map(m => ({ ...m, tipoDisplay: "pdv" as const })),
    ...metasIndividuaisAtivas.map(m => ({ ...m, tipoDisplay: "individual" as const })),
  ];

  // Ordenar por progresso (piores primeiro)
  todasMetas.sort((a, b) => (a.progresso?.percentual ?? 0) - (b.progresso?.percentual ?? 0));

  return (
    <>
      {/* Header com KPIs */}
      <MetasKPIHeader kpis={kpis} />

      {/* Conteúdo principal: Lista de metas + Ranking */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Lista de metas */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Metas Ativas</h2>
              <p className="text-sm text-slate-500">{kpis.totalAtivas} metas em andamento</p>
            </div>
            
            {/* Botão nova meta */}
            {(vm.podeCriarGlobal || vm.podeCriarMetaPdv || vm.podeCriarMetaIndividual) && (
              <Button onClick={() => vm.abrirNovaMeta()} size="sm" className="rounded-xl">
                <Plus className="mr-1.5 h-4 w-4" />
                Nova Meta
              </Button>
            )}
          </div>

          {/* Legenda */}
          <div className="mb-4 flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> 🟢 &gt;70%
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> 🟡 50-70%
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-rose-500" /> 🔴 &lt;50%
            </span>
          </div>

          {/* Lista de metas compactas */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {todasMetas.map((meta) => {
              const podeEditar = 
                meta.tipo === "GLOBAL" ? vm.podeCriarGlobal :
                meta.tipo === "PDV" ? vm.podeCriarMetaPdv :
                vm.podeCriarMetaIndividual;

              return (
                <MetaCardCompact
                  key={meta.id}
                  meta={meta}
                  podeEditar={podeEditar}
                  desativando={vm.desativandoId === meta.id}
                  onEditar={vm.abrirEdicao}
                  onDesativar={(id) => void vm.desativarMeta(id)}
                />
              );
            })}
          </div>
        </section>

        {/* Ranking lateral */}
        <aside className="lg:sticky lg:top-4 lg:h-fit">
          <RankingWidget 
            ranking={vm.ranking} 
            mediaEquipe={vm.mediaEquipe} 
            totalParticipantes={vm.totalParticipantes} 
          />
        </aside>
      </div>

      <MetaFormDialog vm={vm} />
    </>
  );
}
