"use client";

import { use } from "react";
import { useCallback, useMemo, useState } from "react";
import { useToast } from "@/components/ui/toast";
import {
  criarProduto,
  atualizarProduto,
  listarProdutos,
  parseSchemaLayout,
  type CampoProduto,
  type Produto,
  type SchemaLayoutProduto,
} from "@/lib/api/produtos";
import type { ProdutoFormState, UseProdutosModuleReturn } from "../types";

function criarCampoPadrao(indice: number): CampoProduto {
  const id = `campo-${Date.now()}-${indice}`;
  return {
    id,
    tipo: "texto",
    label: "Novo campo",
    obrigatorio: false,
    largura: "full",
    visivelNoResumo: true,
    ordem: indice,
  };
}

function criarFormPadrao(): ProdutoFormState {
  return {
    nome: "",
    descricao: "",
    ativo: true,
    schemaLayout: {
      versao: 1,
      campos: [],
    },
  };
}

async function carregarProdutosIniciais(): Promise<{ produtos: Produto[]; erro: string | null }> {
  const resultado = await listarProdutos();
  if (!resultado.ok) {
    return { produtos: [], erro: resultado.erro };
  }

  return { produtos: resultado.dados.produtos, erro: null };
}

export function useProdutosModule(): UseProdutosModuleReturn {
  const { addToast } = useToast();
  const estadoInicial = use(carregarProdutosIniciais());
  const [produtos, setProdutos] = useState<Produto[]>(estadoInicial.produtos);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(estadoInicial.erro);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [produtoEmEdicao, setProdutoEmEdicao] = useState<Produto | null>(null);
  const [form, setForm] = useState<ProdutoFormState>(criarFormPadrao());

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    const resultado = await listarProdutos();
    if (!resultado.ok) {
      setErro(resultado.erro);
      setCarregando(false);
      return;
    }

    setProdutos(resultado.dados.produtos);
    setCarregando(false);
  }, []);
  const atualizarForm = useCallback((dados: Partial<ProdutoFormState>) => {
    setForm((atual) => ({ ...atual, ...dados }));
  }, []);

  const adicionarCampo = useCallback(() => {
    setForm((atual) => ({
      ...atual,
      schemaLayout: {
        ...atual.schemaLayout,
        campos: [...atual.schemaLayout.campos, criarCampoPadrao(atual.schemaLayout.campos.length)],
      },
    }));
  }, []);

  const atualizarCampo = useCallback((campoId: string, dados: Record<string, unknown>) => {
    setForm((atual) => ({
      ...atual,
      schemaLayout: {
        ...atual.schemaLayout,
        campos: atual.schemaLayout.campos.map((campo) =>
          campo.id === campoId ? { ...campo, ...dados } as CampoProduto : campo,
        ),
      },
    }));
  }, []);

  const removerCampo = useCallback((campoId: string) => {
    setForm((atual) => ({
      ...atual,
      schemaLayout: {
        ...atual.schemaLayout,
        campos: atual.schemaLayout.campos
          .filter((campo) => campo.id !== campoId)
          .map((campo, indice) => ({ ...campo, ordem: indice })),
      },
    }));
  }, []);

  const moverCampo = useCallback((campoId: string, direcao: "cima" | "baixo") => {
    setForm((atual) => {
      const campos = [...atual.schemaLayout.campos].sort((a, b) => a.ordem - b.ordem);
      const indiceAtual = campos.findIndex((campo) => campo.id === campoId);
      if (indiceAtual === -1) return atual;

      const indiceDestino = direcao === "cima" ? indiceAtual - 1 : indiceAtual + 1;
      if (indiceDestino < 0 || indiceDestino >= campos.length) return atual;

      const copia = [...campos];
      const [item] = copia.splice(indiceAtual, 1);
      copia.splice(indiceDestino, 0, item);

      return {
        ...atual,
        schemaLayout: {
          ...atual.schemaLayout,
          campos: copia.map((campo, indice) => ({ ...campo, ordem: indice })),
        },
      };
    });
  }, []);

  const abrirCriacao = useCallback(() => {
    setProdutoEmEdicao(null);
    setForm(criarFormPadrao());
    setDialogAberto(true);
  }, []);

  const abrirEdicao = useCallback((produto: Produto) => {
    setProdutoEmEdicao(produto);
    const schema = parseSchemaLayout(produto.schema_layout);
    setForm({
      nome: produto.nome,
      descricao: produto.descricao ?? "",
      ativo: produto.ativo,
      schemaLayout: schema,
    });
    setDialogAberto(true);
  }, []);

  const payload = useMemo(() => ({
    nome: form.nome.trim(),
    descricao: form.descricao.trim() || null,
    ativo: form.ativo,
    schema_layout: {
      versao: form.schemaLayout.versao,
      campos: [...form.schemaLayout.campos].sort((a, b) => a.ordem - b.ordem),
    } as SchemaLayoutProduto,
  }), [form]);

  const salvarProduto = useCallback(async () => {
    setSalvando(true);
    setErro(null);

    const resultado = produtoEmEdicao
      ? await atualizarProduto(produtoEmEdicao.id, payload)
      : await criarProduto(payload);

    if (!resultado.ok) {
      setErro(resultado.erro);
      setSalvando(false);
      return;
    }

    addToast({
      type: "success",
      title: produtoEmEdicao ? "Produto atualizado" : "Produto criado",
      description: `${resultado.dados.produto.nome} foi salvo com sucesso.`,
    });

    setDialogAberto(false);
    setProdutoEmEdicao(null);
    setForm(criarFormPadrao());
    setSalvando(false);
    await recarregar();
  }, [addToast, payload, produtoEmEdicao, recarregar]);

  return {
    produtos,
    carregando,
    salvando,
    erro,
    dialogAberto,
    setDialogAberto,
    produtoEmEdicao,
    form,
    atualizarForm,
    adicionarCampo,
    atualizarCampo,
    removerCampo,
    moverCampo,
    abrirCriacao,
    abrirEdicao,
    salvarProduto,
    recarregar,
  };
}
