"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { listarProdutos, parseSchemaLayout, type Produto } from "@/lib/api/produtos";
import type { ProdutosPageInitialState, UseProdutosCatalogoReturn } from "../types";

export function useProdutosCatalogo(estadoInicial: ProdutosPageInitialState): UseProdutosCatalogoReturn {
  const router = useRouter();
  const [produtos, setProdutos] = useState<Produto[]>(estadoInicial.produtos);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(estadoInicial.erroInicial);
  const [falhaCarregamentoInicial, setFalhaCarregamentoInicial] = useState(estadoInicial.falhaCarregamentoInicial);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    const resultado = await listarProdutos();
    if (!resultado.ok) {
      setErro(resultado.erro);
      setFalhaCarregamentoInicial(true);
      setCarregando(false);
      return;
    }

    setProdutos(resultado.dados.produtos);
    setFalhaCarregamentoInicial(false);
    setCarregando(false);
  }, []);

  const totalProdutos = produtos.length;
  const totalAtivos = useMemo(() => produtos.filter((produto) => produto.ativo).length, [produtos]);
  const totalCampos = useMemo(
    () => produtos.reduce((acumulado, produto) => acumulado + parseSchemaLayout(produto.schema_layout).campos.length, 0),
    [produtos],
  );
  const mediaCamposPorProduto = useMemo(() => {
    if (produtos.length === 0) return 0;
    return Number((totalCampos / produtos.length).toFixed(1));
  }, [produtos.length, totalCampos]);

  const abrirCriacao = useCallback(() => {
    router.push("/produtos/novo");
  }, [router]);

  const abrirEdicao = useCallback((produto: Produto) => {
    router.push(`/produtos/${produto.id}/editar`);
  }, [router]);

  return {
    produtos,
    totalProdutos,
    totalAtivos,
    totalCampos,
    mediaCamposPorProduto,
    carregando,
    erro,
    falhaCarregamentoInicial,
    abrirCriacao,
    abrirEdicao,
    recarregar,
  };
}
