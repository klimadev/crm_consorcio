"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, PackagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
  anexarProdutoLead,
  listarProdutos,
  listarProdutosLead,
  parseSchemaLayout,
  parseValoresLayout,
  removerProdutoLead,
  type LeadProduto,
  type Produto,
} from "@/lib/api/produtos";
import { RenderizadorCamposProduto } from "@/modules/produtos/components/renderizador-campos-produto";

type LeadProdutosTabProps = {
  leadId: string;
};

export function LeadProdutosTab({ leadId }: LeadProdutosTabProps) {
  const { addToast } = useToast();
  const [produtosBase, setProdutosBase] = useState<Produto[]>([]);
  const [produtosLead, setProdutosLead] = useState<LeadProduto[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState("");
  const [valores, setValores] = useState<Record<string, string | number | boolean | null | string[]>>({});
  const [observacoes, setObservacoes] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [removendoId, setRemovendoId] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    const carregar = async () => {
      setLoading(true);
      setErro(null);
      const [resultadoProdutos, resultadoLead] = await Promise.all([listarProdutos(), listarProdutosLead(leadId)]);

      if (!ativo) return;

      if (!resultadoProdutos.ok) {
        setErro(resultadoProdutos.erro);
        setLoading(false);
        return;
      }

      if (!resultadoLead.ok) {
        setErro(resultadoLead.erro);
        setLoading(false);
        return;
      }

      setProdutosBase(resultadoProdutos.dados.produtos.filter((produto) => produto.ativo));
      setProdutosLead(resultadoLead.dados.produtos);
      setLoading(false);
    };

    void carregar();
    return () => {
      ativo = false;
    };
  }, [leadId]);

  const produtoSelecionado = useMemo(
    () => produtosBase.find((produto) => produto.id === produtoSelecionadoId) ?? null,
    [produtoSelecionadoId, produtosBase],
  );

  const schemaSelecionado = produtoSelecionado ? parseSchemaLayout(produtoSelecionado.schema_layout) : null;

  const abrirDialog = () => {
    setProdutoSelecionadoId("");
    setValores({});
    setObservacoes("");
    setDialogAberto(true);
  };

  const salvar = async () => {
    if (!produtoSelecionado) return;
    setSalvando(true);
    const resultado = await anexarProdutoLead(leadId, {
      id_produto: produtoSelecionado.id,
      valores_layout: valores,
      observacoes: observacoes.trim() || null,
    });

    if (!resultado.ok) {
      setErro(resultado.erro);
      setSalvando(false);
      return;
    }

    setProdutosLead((atual) => [resultado.dados.produto, ...atual]);
    setDialogAberto(false);
    setSalvando(false);
    addToast({
      type: "success",
      title: "Produto anexado",
      description: `${resultado.dados.produto.nome_snapshot} foi vinculado ao lead.`,
    });
  };

  const remover = async (leadProdutoId: string) => {
    setRemovendoId(leadProdutoId);
    const resultado = await removerProdutoLead(leadId, leadProdutoId);
    if (!resultado.ok) {
      setErro(resultado.erro);
      setRemovendoId(null);
      return;
    }

    setProdutosLead((atual) => atual.filter((item) => item.id !== leadProdutoId));
    setRemovendoId(null);
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-border bg-background-surface">
        <Loader2 className="h-5 w-5 animate-spin text-foreground-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background-surface p-4 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Produtos vinculados</h3>
          <p className="text-xs text-foreground-muted">Anexe templates internos com valores proprios desta negociacao.</p>
        </div>
        <Button type="button" onClick={abrirDialog} className="bg-success text-success-foreground hover:bg-success/90">
          <PackagePlus className="mr-2 h-4 w-4" />
          Anexar produto
        </Button>
      </div>

      {produtosLead.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted p-4 text-sm text-foreground-muted">
          Nenhum produto anexado a este lead.
        </div>
      ) : (
        produtosLead.map((item) => {
          const schema = parseSchemaLayout(item.schema_snapshot);
          const valoresItem = parseValoresLayout(item.valores_layout);
          return (
            <Card key={item.id} className="shadow-sm">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-foreground">{item.nome_snapshot}</h4>
                    {item.observacoes ? <p className="text-sm text-foreground-muted">{item.observacoes}</p> : null}
                  </div>
                  <Button type="button" variant="outline" size="icon" onClick={() => void remover(item.id)} disabled={removendoId === item.id}>
                    <span className="sr-only">Remover produto {item.nome_snapshot}</span>
                    {removendoId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                  </Button>
                </div>

                <RenderizadorCamposProduto campos={schema.campos.filter((campo) => campo.visivelNoResumo)} valores={valoresItem} somenteLeitura />
              </CardContent>
            </Card>
          );
        })
      )}

      {erro ? (
        <div className="rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
          <p className="flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4" />
            {erro}
          </p>
        </div>
      ) : null}

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Anexar produto ao lead</DialogTitle>
            <DialogDescription>Selecione um produto base e preencha os valores desta negociacao.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="lead-produto-base" className="text-xs font-medium text-foreground-muted">Produto</label>
              <Select value={produtoSelecionadoId} onValueChange={(value) => { setProdutoSelecionadoId(value); setValores({}); }}>
                <SelectTrigger id="lead-produto-base">
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  {produtosBase.map((produto) => (
                    <SelectItem key={produto.id} value={produto.id}>
                      {produto.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {schemaSelecionado ? (
              <RenderizadorCamposProduto
                campos={schemaSelecionado.campos}
                valores={valores}
                onChange={(campoId, valor) => setValores((atual) => ({ ...atual, [campoId]: valor }))}
              />
            ) : null}

            <div className="space-y-1.5">
              <label htmlFor="lead-produto-observacoes" className="text-xs font-medium text-foreground-muted">Observações</label>
              <Textarea id="lead-produto-observacoes" value={observacoes} onChange={(event) => setObservacoes(event.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogAberto(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void salvar()} disabled={salvando || !produtoSelecionado} className="bg-success text-success-foreground hover:bg-success/90">
              {salvando ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </span>
              ) : (
                "Anexar produto"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
