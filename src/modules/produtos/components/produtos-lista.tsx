import { Boxes, PencilLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseSchemaLayout } from "@/lib/api/produtos";
import type { UseProdutosModuleReturn } from "../types";

type ProdutosListaProps = {
  vm: UseProdutosModuleReturn;
};

export function ProdutosLista({ vm }: ProdutosListaProps) {
  if (vm.carregando) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Carregando produtos...</div>;
  }

  if (vm.produtos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
        Nenhum produto interno cadastrado ainda.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {vm.produtos.map((produto) => {
        const schema = parseSchemaLayout(produto.schema_layout);
        return (
          <Card key={produto.id} className="shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2 text-base text-slate-800">
                  <Boxes className="h-4 w-4 text-emerald-600" />
                  {produto.nome}
                </CardTitle>
                <p className="mt-1 text-sm text-slate-500">{produto.descricao || "Produto interno sem descricao."}</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => vm.abrirEdicao(produto)}>
                <PencilLine className="mr-2 h-4 w-4" />
                Editar
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant={produto.ativo ? "success" : "secondary"}>{produto.ativo ? "Ativo" : "Inativo"}</Badge>
                <Badge variant="info">{schema.campos.length} campos</Badge>
              </div>

              <div className="space-y-2 rounded-xl bg-slate-50 p-3">
                {schema.campos.slice(0, 4).map((campo) => (
                  <div key={campo.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-slate-700">{campo.label}</span>
                    <span className="text-xs uppercase text-slate-400">{campo.tipo}</span>
                  </div>
                ))}
                {schema.campos.length > 4 ? <p className="text-xs text-slate-400">+ {schema.campos.length - 4} campos adicionais</p> : null}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
