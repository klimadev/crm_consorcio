"use client";

import { useState } from "react";
import { ModulePageShell } from "@/components/shared/module-page-shell";
import { InlineStatusAlert } from "@/components/shared/inline-status-alert";
import { AccessDeniedCard } from "@/components/shared/access-denied-card";
import { useEquipeModule } from "./hooks/use-equipe-module";
import { EquipeHeader } from "./components/equipe-header";
import { EquipeBreadcrumb } from "./components/equipe-breadcrumb";
import { EquipeFilters } from "./components/equipe-filters";
import { EquipeDesktopTable } from "./components/equipe-desktop-table";
import { EquipeMobileList } from "./components/equipe-mobile-list";
import { FuncionarioEditarDrawer } from "./components/funcionario-editar-drawer";
import { PdvManagementPanel } from "./components/pdv-management-panel";
import { EquipeBulkActions } from "./components/equipe-bulk-actions";
import { NovoFuncionarioDialog } from "./components/dialogs/novo-funcionario-dialog";
import { InativacaoDialog } from "./components/dialogs/inativacao-dialog";
import type { Props } from "./types";

export function ModuloEquipe({ perfil, id_pdv }: Props) {
  const vm = useEquipeModule({ perfil, id_pdv });
  const [drawerNovoPdvAberto, setDrawerNovoPdvAberto] = useState(false);

  const pdvSelecionado = vm.idPdvFiltro
    ? vm.pdvs.find((p) => p.id === vm.idPdvFiltro)
    : null;
  const modoDetail = Boolean(pdvSelecionado);

  if (perfil === "COLABORADOR") {
    return (
      <AccessDeniedCard
        title="Sem permissao para acessar equipe"
        description="Este modulo e visivel apenas para perfis de gestao. Solicite ao administrador da empresa a elevacao de permissao."
      />
    );
  }

  const voltarOverview = () => vm.atualizarParametrosUrl({ id_pdv: null }, true);

  return (
    <ModulePageShell className="space-y-4 pb-28 md:pb-28">
      {/* Breadcrumb — navegação profunda "Equipe > Nome do PDV" */}
      {modoDetail && pdvSelecionado && (
        <EquipeBreadcrumb pdvNome={pdvSelecionado.nome} onVoltar={voltarOverview} />
      )}

      {/* Header adaptativo: overview vs detalhe PDV */}
      <EquipeHeader
        vm={vm}
        onAbrirNovoPdv={() => setDrawerNovoPdvAberto(true)}
        pdvFocado={pdvSelecionado}
        onVoltarOverview={voltarOverview}
      />

      <InlineStatusAlert variant="error" message={vm.erroLista} />

      {/* ── MODO DETAIL: foco na equipe de um PDV específico ── */}
      {modoDetail && (
        <>
          <div className="rounded-2xl border border-border bg-background-surface shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <EquipeFilters vm={vm} />
            <EquipeDesktopTable vm={vm} modoDetail />
            <EquipeMobileList vm={vm} />
          </div>
        </>
      )}

      {/* ── MODO OVERVIEW: gestão de PDVs + visão geral da equipe ── */}
      {!modoDetail && (
        <>
          {vm.podeAdicionarFuncionario ? (
            <div className="rounded-2xl border border-border bg-background-surface p-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)] md:p-4">
              <PdvManagementPanel
                vm={vm}
                drawerNovoPdvAberto={drawerNovoPdvAberto}
                setDrawerNovoPdvAberto={setDrawerNovoPdvAberto}
              />
            </div>
          ) : null}

          <div className="rounded-2xl border border-border bg-background-surface shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <EquipeFilters vm={vm} />
            <EquipeDesktopTable vm={vm} modoDetail={false} />
            <EquipeMobileList vm={vm} />
          </div>
        </>
      )}

      <EquipeBulkActions vm={vm} />

      <FuncionarioEditarDrawer
        vm={vm}
        funcionario={vm.editandoFuncionario}
        aberto={vm.drawerEdicaoAberto}
        onFechar={vm.fecharDrawerEdicao}
      />

      <NovoFuncionarioDialog vm={vm} />
      <InativacaoDialog vm={vm} />
    </ModulePageShell>
  );
}
