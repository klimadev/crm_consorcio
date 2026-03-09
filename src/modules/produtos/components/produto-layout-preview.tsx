import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseSchemaLayout, type SchemaLayoutProduto } from "@/lib/api/produtos";
import { RenderizadorCamposProduto } from "./renderizador-campos-produto";

type ProdutoLayoutPreviewProps = {
  schemaLayout: SchemaLayoutProduto | string;
};

export function ProdutoLayoutPreview({ schemaLayout }: ProdutoLayoutPreviewProps) {
  const schema = typeof schemaLayout === "string" ? parseSchemaLayout(schemaLayout) : schemaLayout;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Preview do layout</CardTitle>
      </CardHeader>
      <CardContent>
        {schema.campos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            Adicione campos para visualizar o formulario dinamico.
          </div>
        ) : (
          <RenderizadorCamposProduto campos={schema.campos} valores={{}} somenteLeitura />
        )}
      </CardContent>
    </Card>
  );
}
