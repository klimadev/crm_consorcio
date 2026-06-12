"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineStatusAlert } from "@/components/shared/inline-status-alert";
import { useMetasModule } from "@/modules/metas/hooks/use-metas-module";
import { MetasHeader } from "@/modules/metas/components/metas-header";
import { MetaWeekGrid } from "@/modules/metas/components/meta-week-grid";
import { MetaRanking } from "@/modules/metas/components/meta-ranking";
import { MetaCreateSheet } from "@/modules/metas/components/meta-create-sheet";

type Props = {
  perfil: "EMPRESA" | "GERENTE" | "COLABORADOR";
  id_pdv?: string | null;
  modo: "painel";
};

export function MetasPage({ perfil, id_pdv, modo }: Props) {
  const vm = useMetasModule({ perfil, id_pdv, modo });

  const [sheetEquipe, setSheetEquipe] = useState("");
  const [sheetSemana, setSheetSemana] = useState(1);
  const [sheetAbertaPorSlot, setSheetAbertaPorSlot] = useState(false);

  const handleCriarMeta = (equipe: string, semana: number) => {
    setSheetEquipe(equipe);
    setSheetSemana(semana);
    setSheetAbertaPorSlot(true);
    vm.abrirNovaMeta();
  };

  // Mescla sheet aberta por slot ou por botão
  const sheetAberta = vm.wizardAberto;
  const sheetEquipeFinal = sheetAbertaPorSlot ? sheetEquipe : (vm.equipeSelecionada ?? "");
  const sheetSemanaFinal = sheetAbertaPorSlot ? sheetSemana : 1;

  const handleCloseSheet = () => {
    setSheetAbertaPorSlot(false);
    vm.fecharWizard();
  };

  // Se COLABORADOR, não tem acesso
  if (perfil === "COLABORADOR") {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <p className="text-foreground-muted">Você não tem acesso às metas da equipe.</p>
      </div>
    );
  }

  if (vm.carregando) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-foreground-muted" />
        <p className="mt-4 text-sm text-foreground-muted">Carregando metas...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6">
      {/* Header com filtros + métricas + proporção */}
      <MetasHeader
        resumo={vm.resumo}
        opcoesEquipes={vm.opcoesEquipes}
        equipeSelecionada={vm.equipeSelecionada}
        onEquipeChange={vm.setEquipeSelecionada}
        perfil={perfil}
        mesReferencia={vm.mesReferencia}
        periodosDisponiveis={vm.periodosDisponiveis}
        onMesChange={vm.setMesReferencia}
        comparacaoAtiva={vm.comparacaoAtiva}
        onComparacaoToggle={vm.setComparacaoAtiva}
        mesComparacao={vm.mesComparacao}
        onMesComparacaoChange={vm.setMesComparacao}
        proporcaoEquipes={vm.proporcaoEquipes}
      />

      {vm.erro && (
        <InlineStatusAlert variant="error" message={vm.erro} />
      )}

      {/* Grade semanal */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Grade semanal</h3>
          {vm.podeCriarMeta && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSheetAbertaPorSlot(false);
                vm.abrirNovaMeta();
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              Nova meta
            </Button>
          )}
        </div>

        <MetaWeekGrid
          metasPorEquipe={vm.metasPorEquipe}
          mesReferencia={vm.mesReferencia}
          equipeSelecionada={vm.equipeSelecionada}
          onCriarMeta={handleCriarMeta}
          onEditarMeta={vm.abrirEdicao}
          onArquivarMeta={vm.arquivarMeta}
        />
      </section>

      {/* Ranking com recharts + detalhes expansíveis */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Ranking de equipes</h3>
        {vm.carregandoComparacao && (
          <div className="flex items-center gap-2 text-xs text-foreground-muted">
            <Loader2 className="h-3 w-3 animate-spin" />
            Carregando comparação...
          </div>
        )}
        <MetaRanking
          ranking={vm.ranking}
          rankingComparado={vm.rankingComparado}
          mediaGeral={vm.mediaGeral}
          totalParticipantes={vm.totalParticipantes}
          comparacaoAtiva={vm.comparacaoAtiva}
          dadosComparacao={vm.dadosComparacao}
          metasPorEquipe={vm.metasPorEquipe}
        />
      </section>

      {/* Wizard Sheet */}
      <MetaCreateSheet
        aberto={sheetAberta}
        onClose={handleCloseSheet}
        onCreate={vm.criarMeta}
        onUpdate={vm.editarMeta}
        opcoesEquipes={vm.opcoesEquipes}
        equipePadrao={sheetEquipeFinal || vm.equipeSelecionada}
        metaEmEdicao={vm.metaEmEdicao}
        salvando={vm.salvando}
        erro={vm.erro}
      />
    </div>
  );
}
