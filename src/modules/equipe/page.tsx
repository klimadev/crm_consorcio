"use client";

import { useState } from "react";
import { ModulePageShell } from "@/components/shared/module-page-shell";
import { InlineStatusAlert } from "@/components/shared/inline-status-alert";
import { AccessDeniedCard } from "@/components/shared/access-denied-card";
import { useEquipeModule } from "./hooks/use-equipe-module";
import { EquipeHeader } from "./components/equipe-header";
import { PdvManagementPanel } from "./components/pdv-management-panel";
import { NovoFuncionarioDialog } from "./components/dialogs/novo-funcionario-dialog";
import { InativacaoDialog } from "./components/dialogs/inativacao-dialog";
import type { Props } from "./types";

export function ModuloEquipe({ perfil, id_pdv }: Props) {
  const vm = useEquipeModule({ perfil, id_pdv });
  const [drawerNovoPdvAberto, setDrawerNovoPdvAberto] = useState(false);

  if (perfil === "COLABORADOR") {
    return (
      <AccessDeniedCard
        title="Sem permissao para acessar equipe"
        description="Este modulo e visivel apenas para perfis de gestao. Solicite ao administrador da empresa a elevacao de permissao."
      />
    );
  }

  return (
    <ModulePageShell className="space-y-4 pb-28 md:pb-28">
      <EquipeHeader vm={vm} onAbrirNovoPdv={() => setDrawerNovoPdvAberto(true)} />

      <InlineStatusAlert variant="error" message={vm.erroLista} />

      {vm.podeAdicionarFuncionario ? (
        <div className="rounded-2xl border border-slate-200/70 bg-white p-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)] md:p-4">
          <PdvManagementPanel vm={vm} drawerNovoPdvAberto={drawerNovoPdvAberto} setDrawerNovoPdvAberto={setDrawerNovoPdvAberto} />
        </div>
      ) : null}

      <NovoFuncionarioDialog vm={vm} />
      <InativacaoDialog vm={vm} />
    </ModulePageShell>
  );
}
