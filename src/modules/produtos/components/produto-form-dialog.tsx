import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { UseProdutosModuleReturn } from "../types";
import { ProdutoLayoutBuilder } from "./produto-layout-builder";
import { ProdutoLayoutPreview } from "./produto-layout-preview";

type ProdutoFormDialogProps = {
  vm: UseProdutosModuleReturn;
};

export function ProdutoFormDialog({ vm }: ProdutoFormDialogProps) {
  return (
    <Dialog open={vm.dialogAberto} onOpenChange={vm.setDialogAberto}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{vm.produtoEmEdicao ? "Editar produto" : "Novo produto"}</DialogTitle>
          <DialogDescription>
            Configure os campos dinamicos do produto interno para reutilizar no lead.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-medium text-slate-600">Nome do produto</label>
                <Input value={vm.form.nome} onChange={(event) => vm.atualizarForm({ nome: event.target.value })} />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-medium text-slate-600">Descricao</label>
                <Textarea value={vm.form.descricao} onChange={(event) => vm.atualizarForm({ descricao: event.target.value })} />
              </div>
            </div>

            <ProdutoLayoutBuilder
              campos={vm.form.schemaLayout.campos}
              onAdicionarCampo={vm.adicionarCampo}
              onAtualizarCampo={vm.atualizarCampo}
              onRemoverCampo={vm.removerCampo}
              onMoverCampo={vm.moverCampo}
            />
          </div>

          <ProdutoLayoutPreview schemaLayout={vm.form.schemaLayout} />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => vm.setDialogAberto(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void vm.salvarProduto()} disabled={vm.salvando} className="bg-emerald-600 text-white hover:bg-emerald-700">
            {vm.salvando ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </span>
            ) : vm.produtoEmEdicao ? (
              "Salvar alteracoes"
            ) : (
              "Criar produto"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
