import { CalendarClock, CheckCircle2, CircleOff, Eye, Files, PencilLine, Rows3, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { parseSchemaLayout } from "@/lib/api/produtos";
import type { UseProdutosCatalogoReturn } from "../types";

type ProdutosListaProps = {
  vm: UseProdutosCatalogoReturn;
};

export function ProdutosLista({ vm }: ProdutosListaProps) {
  if (vm.carregando) {
    return (
      <div className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, indice) => (
          <Card key={`skeleton-${indice}`} className="overflow-hidden rounded-[2rem] border-slate-200/80 bg-white shadow-sm">
            <CardHeader className="space-y-6 p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-4">
                  <div className="h-4 w-32 animate-pulse rounded-full bg-slate-200" />
                  <div className="h-7 w-52 animate-pulse rounded-full bg-slate-200" />
                </div>
                <div className="h-11 w-24 animate-pulse rounded-2xl bg-slate-200" />
              </div>
              <div className="h-20 animate-pulse rounded-[1.5rem] bg-slate-100" />
            </CardHeader>
            <CardContent className="space-y-5 p-6 pt-0 sm:p-8 sm:pt-0">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="h-24 animate-pulse rounded-[1.5rem] bg-slate-100" />
                <div className="h-24 animate-pulse rounded-[1.5rem] bg-slate-100" />
                <div className="h-24 animate-pulse rounded-[1.5rem] bg-slate-100" />
              </div>
              <div className="space-y-3 rounded-[1.75rem] bg-slate-50 p-5">
                <div className="h-12 animate-pulse rounded-2xl bg-slate-200/80" />
                <div className="h-12 animate-pulse rounded-2xl bg-slate-200/70" />
                <div className="h-12 animate-pulse rounded-2xl bg-slate-200/60" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (vm.falhaCarregamentoInicial) {
    return (
      <Card className="overflow-hidden rounded-[2rem] border-rose-200 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(255,241,242,0.94))] shadow-sm">
        <CardContent className="flex flex-col items-center gap-5 px-6 py-14 text-center sm:px-10">
          <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-rose-100 text-rose-700 shadow-sm">
            <CircleOff className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Nao foi possivel carregar o catalogo</h3>
            <p className="max-w-xl text-sm leading-6 text-slate-500 sm:text-base">Tente atualizar a lista antes de criar ou editar templates.</p>
          </div>
          <Button onClick={() => void vm.recarregar()} className="h-12 rounded-2xl bg-emerald-600 px-6 text-white hover:bg-emerald-700">
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (vm.produtos.length === 0) {
    return (
      <Card className="overflow-hidden rounded-[2.25rem] border-dashed border-slate-300 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(180deg,_#ffffff,_#f8fafc)] shadow-sm">
        <CardContent className="flex flex-col items-center gap-5 px-6 py-16 text-center sm:px-10">
          <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-emerald-100 text-emerald-700 shadow-sm">
            <Sparkles className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Crie o primeiro template de produto</h3>
            <p className="max-w-xl text-sm leading-6 text-slate-500 sm:text-base">Monte o formulario e use no lead.</p>
          </div>
          <Button onClick={vm.abrirCriacao} className="h-12 rounded-2xl bg-emerald-600 px-6 text-white hover:bg-emerald-700">
            <Files className="mr-2 h-4 w-4" />
            Criar primeiro produto
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Catalogo</p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">Produtos prontos para o time usar</h3>
        </div>
        <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
          {vm.totalProdutos} {vm.totalProdutos === 1 ? "template" : "templates"}
        </div>
      </div>

      <div className="grid gap-4 2xl:grid-cols-2">
      {vm.produtos.map((produto) => {
        const schema = parseSchemaLayout(produto.schema_layout);
        const camposResumo = schema.campos.filter((campo) => campo.visivelNoResumo);
        const camposObrigatorios = schema.campos.filter((campo) => campo.obrigatorio).length;
        const atualizadoEm = new Date(produto.atualizado_em).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });

        return (
          <Card
            key={produto.id}
            className={cn(
              "overflow-hidden rounded-[1.5rem] border shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)]",
              produto.ativo
                ? "border-slate-200/80 bg-white"
                : "border-slate-200/80 bg-slate-50/90 text-slate-500 hover:shadow-sm",
            )}
          >
            <CardHeader className="space-y-4 border-b border-slate-100/80 bg-[linear-gradient(180deg,_rgba(255,255,255,1),_rgba(248,250,252,0.72))] p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={produto.ativo ? "success" : "secondary"}>{produto.ativo ? "Ativo" : "Inativo"}</Badge>
                    <Badge variant="info">{schema.campos.length} campos</Badge>
                    {camposObrigatorios > 0 ? <Badge variant="secondary">{camposObrigatorios} obrigatorios</Badge> : null}
                  </div>
                  <CardTitle className="flex items-start gap-3 text-slate-900">
                    <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-[1rem] bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                      <Rows3 className="h-4.5 w-4.5" />
                    </div>
                    <div className="space-y-2">
                      <span className="block text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">{produto.nome}</span>
                      <p className="max-w-2xl text-sm font-normal leading-6 text-slate-500">
                        {produto.descricao || "Formulario interno para uso no lead."}
                      </p>
                    </div>
                  </CardTitle>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => vm.abrirEdicao(produto)} className="h-10 rounded-xl px-4 sm:w-auto">
                  <PencilLine className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.2rem] border border-slate-200/80 bg-white p-4">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                    <Eye className="h-3.5 w-3.5" />
                    Resumo visivel
                  </div>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{camposResumo.length}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">campos no resumo rapido</p>
                </div>
                <div className="rounded-[1.2rem] border border-slate-200/80 bg-white p-4">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                    {produto.ativo ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <CircleOff className="h-3.5 w-3.5 text-slate-400" />}
                    Status operacional
                  </div>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{produto.ativo ? "Pronto" : "Pausado"}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{produto.ativo ? "Disponivel para novos leads" : "Mantido sem uso imediato"}</p>
                </div>
                <div className="rounded-[1.2rem] border border-slate-200/80 bg-white p-4">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Atualizacao
                  </div>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{atualizadoEm}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">ultima revisao registrada</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-5 sm:p-6">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Perguntas que o time vai enxergar</p>

                {schema.campos.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-500">
                    Sem campos configurados.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {schema.campos.slice(0, 4).map((campo) => (
                      <div key={campo.id} className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-800">{campo.label}</p>
                          <p className="truncate text-xs text-slate-400">{campo.placeholder || campo.ajuda || "Campo do formulario."}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {campo.obrigatorio ? <Badge variant="secondary">Obrigatorio</Badge> : null}
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">{campo.tipo}</span>
                        </div>
                      </div>
                    ))}
                    {schema.campos.length > 4 ? (
                      <p className="text-xs font-medium text-slate-400">+ {schema.campos.length - 4} campos</p>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">Interno</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">Lead</span>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">Dinamico</span>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => vm.abrirEdicao(produto)} className="rounded-xl px-3 text-slate-600 hover:text-slate-900">
                  Abrir painel
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
      </div>
    </div>
  );
}
