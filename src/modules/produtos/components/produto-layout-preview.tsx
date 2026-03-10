import { RenderizadorCamposProduto } from "./renderizador-campos-produto";
import type { SchemaLayoutProduto } from "@/lib/api/produtos";

type ProdutoLayoutPreviewProps = {
  schemaLayout: SchemaLayoutProduto | string;
};

export function ProdutoLayoutPreview({ schemaLayout }: ProdutoLayoutPreviewProps) {
  const schema = typeof schemaLayout === "string" ? JSON.parse(schemaLayout) : schemaLayout;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      {schema.campos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
          <p>Adicione campos para ver o preview.</p>
        </div>
      ) : (
        <RenderizadorCamposProduto campos={schema.campos} valores={{}} somenteLeitura />
      )}
    </div>
  );
}
