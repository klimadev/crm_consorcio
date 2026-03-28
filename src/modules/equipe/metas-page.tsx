"use client";

import { InlineStatusAlert } from "@/components/shared/inline-status-alert";
import { ModulePageShell } from "@/components/shared/module-page-shell";
import type { Perfil } from "@/lib/tipos";
import { useMetasModule } from "./hooks/use-metas-module";
import { MetaAdminPanel, MetasHeader } from "./components/metas";

type ModuloMetasEquipeProps = {
  perfil: Perfil;
  id_pdv?: string | null;
};

export function ModuloMetasEquipe({ perfil, id_pdv }: ModuloMetasEquipeProps) {
  const vm = useMetasModule({ perfil, id_pdv, modo: "painel" });

  return (
    <ModulePageShell spacing="lg">
      <MetasHeader vm={vm} />
      <InlineStatusAlert variant="error" message={vm.erro} />
      <MetaAdminPanel vm={vm} />
    </ModulePageShell>
  );
}
