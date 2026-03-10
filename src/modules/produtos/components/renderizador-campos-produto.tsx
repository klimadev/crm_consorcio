import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CampoProduto } from "@/lib/api/produtos";
import { cn } from "@/lib/utils";

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
  function obterInputType(campo: CampoProduto) {
    switch (campo.tipo) {
      case "numero":
        return "number";
      case "moeda":
        return "number";
      case "data":
        return "date";
      case "imagem":
        return "url";
      default:
        return "text";
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {campos.sort((a, b) => a.ordem - b.ordem).map((campo) => {
        const valor = valores[campo.id];
        const inputType = obterInputType(campo);
        const larguraClasse = campo.largura === "full" ? "md:col-span-2" : campo.largura === "lg" ? "md:col-span-2" : "";

         return (
           <div key={campo.id} className={cn("rounded-lg border border-slate-200 bg-white p-4", larguraClasse)}>
             <div className="mb-3">
               <label className="block text-sm font-medium text-slate-900">
                 {campo.label}
                 {campo.obrigatorio ? <span className="text-rose-500"> *</span> : null}
               </label>
               {campo.ajuda && (
                 <p className="mt-1 text-xs text-slate-500">{campo.ajuda}</p>
               )}
             </div>

             {campo.tipo === "textarea" ? (
               <Textarea
                 value={typeof valor === "string" ? valor : ""}
                 placeholder={campo.placeholder}
                 readOnly={somenteLeitura}
                 onChange={(event) => onChange?.(campo.id, event.target.value)}
                 className="min-h-24 border-slate-200"
               />
             ) : campo.tipo === "select" ? (
               <Select
                 value={typeof valor === "string" ? valor : ""}
                 onValueChange={(novoValor) => onChange?.(campo.id, novoValor)}
                 disabled={somenteLeitura}
               >
                 <SelectTrigger className="border-slate-200">
                   <SelectValue placeholder={campo.placeholder ?? "Selecione uma opção"} />
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
                 className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                 value={valor === true ? "true" : valor === false ? "false" : ""}
                 disabled={somenteLeitura}
                 onChange={(event) => {
                   const novoValor = event.target.value;
                   onChange?.(campo.id, novoValor === "true" ? true : novoValor === "false" ? false : null);
                 }}
               >
                 <option value="">Selecione</option>
                 <option value="true">Sim</option>
                 <option value="false">Não</option>
               </select>
              ) : (
                <Input
                  type={inputType}
                  value={typeof valor === "string" || typeof valor === "number" ? String(valor) : ""}
                  placeholder={campo.placeholder}
                  readOnly={somenteLeitura}
                  onChange={(event) => onChange?.(campo.id, campo.tipo === "numero" || campo.tipo === "moeda" ? Number(event.target.value || 0) : event.target.value)}
                  className="h-11 border-slate-200"
                />
              )}
           </div>
         );
       })}
     </div>
   );
}
