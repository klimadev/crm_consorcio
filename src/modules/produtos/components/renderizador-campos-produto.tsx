import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CampoProduto } from "@/lib/api/produtos";

type RenderizadorCamposProdutoProps = {
  campos: CampoProduto[];
  valores: Record<string, string | number | boolean | null | string[]>;
  onChange?: (campoId: string, valor: string | number | boolean | null) => void;
  somenteLeitura?: boolean;
};

export function RenderizadorCamposProduto({
  campos,
  valores,
  onChange,
  somenteLeitura = false,
}: RenderizadorCamposProdutoProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {campos.sort((a, b) => a.ordem - b.ordem).map((campo) => {
        const valor = valores[campo.id];
        const largura = campo.largura === "full" ? "md:col-span-2" : "";

        return (
          <div key={campo.id} className={`space-y-1.5 ${largura}`.trim()}>
            <label className="text-xs font-medium text-slate-600">
              {campo.label}
              {campo.obrigatorio ? " *" : ""}
            </label>

            {campo.tipo === "textarea" ? (
              <Textarea
                value={typeof valor === "string" ? valor : ""}
                placeholder={campo.placeholder}
                readOnly={somenteLeitura}
                onChange={(event) => onChange?.(campo.id, event.target.value)}
              />
            ) : campo.tipo === "select" ? (
              <Select
                value={typeof valor === "string" ? valor : ""}
                onValueChange={(novoValor) => onChange?.(campo.id, novoValor)}
                disabled={somenteLeitura}
              >
                <SelectTrigger>
                  <SelectValue placeholder={campo.placeholder ?? "Selecione uma opcao"} />
                </SelectTrigger>
                <SelectContent>
                  {(campo.opcoes ?? []).map((opcao) => (
                    <SelectItem key={opcao.value} value={opcao.value}>
                      {opcao.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : campo.tipo === "boolean" ? (
              <select
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                value={valor === true ? "true" : valor === false ? "false" : ""}
                disabled={somenteLeitura}
                onChange={(event) => {
                  const novoValor = event.target.value;
                  onChange?.(campo.id, novoValor === "true" ? true : novoValor === "false" ? false : null);
                }}
              >
                <option value="">Selecione</option>
                <option value="true">Sim</option>
                <option value="false">Nao</option>
              </select>
            ) : (
              <Input
                type={campo.tipo === "numero" || campo.tipo === "moeda" ? "number" : campo.tipo === "data" ? "date" : campo.tipo === "imagem" ? "url" : "text"}
                value={typeof valor === "string" || typeof valor === "number" ? String(valor) : ""}
                placeholder={campo.placeholder}
                readOnly={somenteLeitura}
                onChange={(event) => onChange?.(campo.id, campo.tipo === "numero" || campo.tipo === "moeda" ? Number(event.target.value || 0) : event.target.value)}
              />
            )}

            {campo.ajuda ? <p className="text-[11px] text-slate-500">{campo.ajuda}</p> : null}
          </div>
        );
      })}
    </div>
  );
}
