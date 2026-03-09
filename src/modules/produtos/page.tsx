"use client";

import { Boxes, PackagePlus } from "lucide-react";
import { ModulePageHeader } from "@/components/shared/module-page-header";
import { ModulePageShell } from "@/components/shared/module-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProdutosModule } from "./hooks/use-produtos-module";
import { ProdutoFormDialog } from "./components/produto-form-dialog";
import { ProdutosLista } from "./components/produtos-lista";

export function ModuloProdutos() {
  const vm = useProdutosModule();

  return (
    <ModulePageShell spacing="lg">
      <ModulePageHeader
        title="Produtos internos"
        subtitle="Cadastre templates comerciais flexiveis para anexar aos leads da pipeline."
        icon={<Boxes className="h-6 w-6" />}
        iconTone="emerald"
        badges={[
          <Badge key="layout" variant="info">Layout dinamico</Badge>,
          <Badge key="lead" variant="success">Uso interno no lead</Badge>,
        ]}
        actions={
          <Button onClick={vm.abrirCriacao} className="bg-emerald-600 text-white hover:bg-emerald-700">
            <PackagePlus className="mr-2 h-4 w-4" />
            Novo produto
          </Button>
        }
      />

      {vm.erro ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{vm.erro}</div> : null}

      <ProdutosLista vm={vm} />
      <ProdutoFormDialog vm={vm} />
    </ModulePageShell>
  );
}
