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
      <div className="grid gap-6 2xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, indice) => (
          <Card key={`skeleton-${indice}`} className="overflow-hidden rounded-[2rem] border-border bg-background-surface shadow-sm">
            <CardHeader className="space-y-6 p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-4">
              <div className="h-4 w-32 animate-pulse rounded-full bg-muted" />
              <div className="h-7 w-52 animate-pulse rounded-full bg-muted" />
                </div>
                <div className="h-11 w-24 animate-pulse rounded-2xl bg-muted" />
              </div>
                <div className="h-20 animate-pulse rounded-[1.5rem] bg-muted/70" />
            </CardHeader>
            <CardContent className="space-y-5 p-6 pt-0 sm:p-8 sm:pt-0">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="h-24 animate-pulse rounded-[1.5rem] bg-muted/70" />
                <div className="h-24 animate-pulse rounded-[1.5rem] bg-muted/70" />
                <div className="h-24 animate-pulse rounded-[1.5rem] bg-muted/70" />
              </div>
              <div className="space-y-3 rounded-[1.75rem] bg-muted/40 p-5">
                <div className="h-12 animate-pulse rounded-2xl bg-muted/80" />
                <div className="h-12 animate-pulse rounded-2xl bg-muted/70" />
                <div className="h-12 animate-pulse rounded-2xl bg-muted/60" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (vm.falhaCarregamentoInicial) {
    return (
      <Card className="overflow-hidden rounded-[2rem] border-destructive/20 bg-background-surface shadow-sm">
        <CardContent className="flex flex-col items-center gap-5 px-6 py-14 text-center sm:px-10">
          <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-destructive/10 text-destructive shadow-sm">
            <CircleOff className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Nao foi possivel carregar o catalogo</h3>
            <p className="max-w-xl text-sm leading-6 text-foreground-muted sm:text-base">Tente atualizar a lista antes de criar ou editar templates.</p>
          </div>
          <Button onClick={() => void vm.recarregar()} className="h-12 rounded-2xl bg-success px-6 text-success-foreground hover:bg-success/90">
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (vm.produtos.length === 0) {
    return (
      <Card className="overflow-hidden rounded-[2.25rem] border-dashed border-border bg-background-surface shadow-sm">
        <CardContent className="flex flex-col items-center gap-5 px-6 py-16 text-center sm:px-10">
          <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-success/15 text-success shadow-sm">
            <Sparkles className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Crie o primeiro template de produto</h3>
            <p className="max-w-xl text-sm leading-6 text-foreground-muted sm:text-base">Monte o formulario e use no lead.</p>
          </div>
          <Button onClick={vm.abrirCriacao} className="h-12 rounded-2xl bg-success px-6 text-success-foreground hover:bg-success/90">
            <Files className="mr-2 h-4 w-4" />
            Criar primeiro produto
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-[1.5rem] border border-border bg-background-surface p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-foreground-muted">Catalogo</p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight text-foreground sm:text-xl">Produtos prontos para o time usar</h3>
        </div>
        <div className="rounded-xl bg-muted px-3 py-2 text-sm font-medium text-foreground">
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
              ? "border-border bg-background-surface"
              : "border-border bg-muted/40 text-foreground-muted hover:shadow-sm",
            )}
          >
            <CardHeader className="space-y-4 border-b border-border bg-background-surface p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={produto.ativo ? "success" : "secondary"}>{produto.ativo ? "Ativo" : "Inativo"}</Badge>
                    <Badge variant="info">{schema.campos.length} campos</Badge>
                    {camposObrigatorios > 0 ? <Badge variant="secondary">{camposObrigatorios} obrigatorios</Badge> : null}
                  </div>
                    <CardTitle className="flex items-start gap-3 text-foreground">
                      <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-[1rem] bg-success/12 text-success ring-1 ring-success/20">
                      <Rows3 className="h-4.5 w-4.5" />
                    </div>
                    <div className="space-y-2">
                        <span className="block text-lg font-semibold tracking-tight text-foreground sm:text-xl">{produto.nome}</span>
                        <p className="max-w-2xl text-sm font-normal leading-6 text-foreground-muted">
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
                <div className="rounded-[1.2rem] border border-border bg-background-surface p-4">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-foreground-muted">
                    <Eye className="h-3.5 w-3.5" />
                    Resumo visivel
                  </div>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{camposResumo.length}</p>
                  <p className="mt-1 text-xs leading-5 text-foreground-muted">campos no resumo rapido</p>
                </div>
                <div className="rounded-[1.2rem] border border-border bg-background-surface p-4">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-foreground-muted">
                    {produto.ativo ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <CircleOff className="h-3.5 w-3.5 text-foreground-muted" />}
                    Status operacional
                  </div>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{produto.ativo ? "Pronto" : "Pausado"}</p>
                  <p className="mt-1 text-xs leading-5 text-foreground-muted">{produto.ativo ? "Disponivel para novos leads" : "Mantido sem uso imediato"}</p>
                </div>
                <div className="rounded-[1.2rem] border border-border bg-background-surface p-4">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-foreground-muted">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Atualizacao
                  </div>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{atualizadoEm}</p>
                  <p className="mt-1 text-xs leading-5 text-foreground-muted">ultima revisao registrada</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-5 sm:p-6">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-foreground-muted">Perguntas que o time vai enxergar</p>

                {schema.campos.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm leading-6 text-foreground-muted">
                    Sem campos configurados.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {schema.campos.slice(0, 4).map((campo) => (
                      <div key={campo.id} className="flex flex-col gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{campo.label}</p>
                          <p className="truncate text-xs text-foreground-muted">{campo.placeholder || campo.ajuda || "Campo do formulario."}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {campo.obrigatorio ? <Badge variant="secondary">Obrigatorio</Badge> : null}
                            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-foreground-muted">{campo.tipo}</span>
                        </div>
                      </div>
                    ))}
                    {schema.campos.length > 4 ? (
                      <p className="text-xs font-medium text-foreground-muted">+ {schema.campos.length - 4} campos</p>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                <div className="flex flex-wrap gap-2 text-xs text-foreground-muted">
                <span className="rounded-full bg-success/10 px-3 py-1 text-success">Interno</span>
                <span className="rounded-full bg-muted px-3 py-1">Lead</span>
                <span className="rounded-full bg-info/10 px-3 py-1 text-info">Dinamico</span>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => vm.abrirEdicao(produto)} className="rounded-xl px-3 text-foreground-muted hover:text-foreground">
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
