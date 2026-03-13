"use client";

import { InlineStatusAlert } from "@/components/shared/inline-status-alert";
import { ModulePageShell } from "@/components/shared/module-page-shell";
import type { Perfil } from "@/lib/tipos";
import { useMetasModule } from "./hooks/use-metas-module";
import { MetaAdminPanel, MetasHeader } from "./components/metas";

type ModuloMetasEquipeProps = {
  perfil: Perfil;
  id_pdv?: string | null;
  id_usuario: string;
};

export function ModuloMetasEquipe({ perfil, id_pdv, id_usuario }: ModuloMetasEquipeProps) {
  const vm = useMetasModule({ perfil, id_pdv, id_usuario, modo: "painel" });

  return (
    <ModulePageShell spacing="lg">
      <MetasHeader vm={vm} />
      <InlineStatusAlert variant="error" message={vm.erro} />
      <MetaAdminPanel vm={vm} />
    </ModulePageShell>
  );
}
