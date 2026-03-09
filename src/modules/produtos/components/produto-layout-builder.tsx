import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CampoProduto } from "@/lib/api/produtos";

type ProdutoLayoutBuilderProps = {
  campos: CampoProduto[];
  onAdicionarCampo: () => void;
  onAtualizarCampo: (campoId: string, dados: Record<string, unknown>) => void;
  onRemoverCampo: (campoId: string) => void;
  onMoverCampo: (campoId: string, direcao: "cima" | "baixo") => void;
};

export function ProdutoLayoutBuilder(props: ProdutoLayoutBuilderProps) {
  const { campos, onAdicionarCampo, onAtualizarCampo, onRemoverCampo, onMoverCampo } = props;

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Campos do produto</CardTitle>
          <p className="text-sm text-slate-500">Monte o layout com campos reutilizaveis e simples.</p>
        </div>
        <Button type="button" onClick={onAdicionarCampo} className="bg-emerald-600 text-white hover:bg-emerald-700">
          <Plus className="mr-2 h-4 w-4" />
          Adicionar campo
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {campos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            Nenhum campo configurado ainda.
          </div>
        ) : null}

        {campos.sort((a, b) => a.ordem - b.ordem).map((campo, indice) => (
          <div key={campo.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Label</label>
                <Input value={campo.label} onChange={(event) => onAtualizarCampo(campo.id, { label: event.target.value })} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Tipo</label>
                <Select value={campo.tipo} onValueChange={(value) => onAtualizarCampo(campo.id, { tipo: value, opcoes: value === "select" ? campo.opcoes ?? [{ label: "Opcao 1", value: "opcao-1" }] : undefined })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="texto">Texto</SelectItem>
                    <SelectItem value="textarea">Texto longo</SelectItem>
                    <SelectItem value="numero">Numero</SelectItem>
                    <SelectItem value="moeda">Moeda</SelectItem>
                    <SelectItem value="telefone">Telefone</SelectItem>
                    <SelectItem value="boolean">Sim/nao</SelectItem>
                    <SelectItem value="select">Lista</SelectItem>
                    <SelectItem value="data">Data</SelectItem>
                    <SelectItem value="imagem">Imagem</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Placeholder</label>
                <Input
                  value={campo.placeholder ?? ""}
                  onChange={(event) => onAtualizarCampo(campo.id, { placeholder: event.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Ajuda</label>
                <Input value={campo.ajuda ?? ""} onChange={(event) => onAtualizarCampo(campo.id, { ajuda: event.target.value })} />
              </div>
            </div>

            {campo.tipo === "select" ? (
              <div className="mt-3 space-y-2">
                <label className="text-xs font-medium text-slate-600">Opcoes (uma por virgula)</label>
                <Input
                  value={(campo.opcoes ?? []).map((opcao) => opcao.label).join(", ")}
                  onChange={(event) => {
                    const opcoes = event.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean)
                      .map((item) => ({ label: item, value: item.toLowerCase().replace(/\s+/g, "-") }));
                    onAtualizarCampo(campo.id, { opcoes });
                  }}
                />
              </div>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onAtualizarCampo(campo.id, { obrigatorio: !campo.obrigatorio })}>
                {campo.obrigatorio ? "Obrigatorio" : "Opcional"}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => onAtualizarCampo(campo.id, { visivelNoResumo: !campo.visivelNoResumo })}>
                {campo.visivelNoResumo ? "Visivel no resumo" : "Oculto no resumo"}
              </Button>
              <Button type="button" variant="outline" size="icon" onClick={() => onMoverCampo(campo.id, "cima")} disabled={indice === 0}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="icon" onClick={() => onMoverCampo(campo.id, "baixo")} disabled={indice === campos.length - 1}>
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="icon" className="text-rose-600" onClick={() => onRemoverCampo(campo.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
