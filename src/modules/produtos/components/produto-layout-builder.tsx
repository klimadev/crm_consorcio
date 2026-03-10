import { ArrowDown, ArrowUp, ChevronDown, GripVertical, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
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
  const [campoExpandidoId, setCampoExpandidoId] = useState<string | null>(null);

  const camposOrdenados = useMemo(() => 
    [...campos].sort((a, b) => a.ordem - b.ordem),
    [campos]
  );

  const abrirNovoCampo = () => {
    onAdicionarCampo();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">Campos</h3>
        <Button type="button" onClick={abrirNovoCampo} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="mr-2 h-4 w-4" />
          Adicionar
        </Button>
      </div>

        {campos.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            Nenhum campo configurado.
          </div>
        ) : (
          <div className="space-y-2">
            {camposOrdenados.map((campo, indice) => {
              const expandido = campoExpandidoId === campo.id;

              return (
              <div key={campo.id} className={cn("rounded-lg border border-slate-200 bg-white", expandido ? "ring-1 ring-emerald-200" : "")}>
                <button 
                  type="button" 
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                  onClick={() => setCampoExpandidoId(expandido ? null : campo.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-slate-400">
                      <GripVertical className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {campo.label.trim() || `Campo ${indice + 1}`}
                      </p>
                      <p className="text-xs text-slate-500">
                        {campo.tipo} {campo.obrigatorio ? "• Obrigatório" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-slate-400 transition-transform", expandido && "rotate-180")}>
                      <ChevronDown className="h-4 w-4" />
                    </span>
                  </div>
                </button>

                {expandido && (
                  <div className="border-t border-slate-200 p-4 space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-500 uppercase">Nome do campo</label>
                      <Input 
                        value={campo.label} 
                        onChange={(event) => onAtualizarCampo(campo.id, { label: event.target.value })} 
                        placeholder="Ex.: Valor da parcela" 
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-500 uppercase">Tipo de resposta</label>
                      <Select value={campo.tipo} onValueChange={(value) => onAtualizarCampo(campo.id, { tipo: value, opcoes: value === "select" ? campo.opcoes ?? [{ label: "Opção 1", value: "opcao-1" }] : undefined })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="texto">Texto</SelectItem>
                          <SelectItem value="textarea">Texto longo</SelectItem>
                          <SelectItem value="numero">Número</SelectItem>
                          <SelectItem value="moeda">Moeda</SelectItem>
                          <SelectItem value="telefone">Telefone</SelectItem>
                          <SelectItem value="boolean">Sim/Não</SelectItem>
                          <SelectItem value="select">Lista</SelectItem>
                          <SelectItem value="data">Data</SelectItem>
                          <SelectItem value="imagem">Imagem</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-500 uppercase">Exemplo</label>
                        <Input
                          value={campo.placeholder ?? ""}
                          onChange={(event) => onAtualizarCampo(campo.id, { placeholder: event.target.value })}
                          placeholder="Ajuda o time"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-500 uppercase">Ajuda</label>
                        <Input 
                          value={campo.ajuda ?? ""} 
                          onChange={(event) => onAtualizarCampo(campo.id, { ajuda: event.target.value })} 
                          placeholder="Instrução curta" 
                        />
                      </div>
                    </div>

                    {campo.tipo === "select" && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-500 uppercase">Opções (uma por vírgula)</label>
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
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => onAtualizarCampo(campo.id, { obrigatorio: !campo.obrigatorio })}
                      >
                        {campo.obrigatorio ? "Opcional" : "Obrigatório"}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => onAtualizarCampo(campo.id, { visivelNoResumo: !campo.visivelNoResumo })}
                      >
                        {campo.visivelNoResumo ? "Ocultar no resumo" : "Mostrar no resumo"}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon"
                        onClick={() => onMoverCampo(campo.id, "cima")} 
                        disabled={indice === 0}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon"
                        onClick={() => onMoverCampo(campo.id, "baixo")} 
                        disabled={indice === camposOrdenados.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon"
                        className="text-rose-600 hover:text-rose-700"
                        onClick={() => onRemoverCampo(campo.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
