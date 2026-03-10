"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import {
  atualizarProduto,
  criarProduto,
  parseSchemaLayout,
  type CampoProduto,
  type Produto,
  type SchemaLayoutProduto,
} from "@/lib/api/produtos";
import type { EtapaProdutoForm, ProdutoFormState, UseProdutoWizardReturn } from "../types";

const ETAPAS_FORMULARIO: Array<{
  id: EtapaProdutoForm;
  titulo: string;
  descricao: string;
}> = [
  { id: "basico", titulo: "Basico", descricao: "Nome e status" },
  { id: "campos", titulo: "Campos", descricao: "Perguntas" },
  { id: "revisao", titulo: "Revisao", descricao: "Salvar" },
];

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

function criarFormProduto(produto?: Produto | null): ProdutoFormState {
  if (!produto) {
    return criarFormPadrao();
  }

  return {
    nome: produto.nome,
    descricao: produto.descricao ?? "",
    ativo: produto.ativo,
    schemaLayout: parseSchemaLayout(produto.schema_layout),
  };
}

export function useProdutoWizard(produtoInicial?: Produto | null): UseProdutoWizardReturn {
  const router = useRouter();
  const { addToast } = useToast();
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [etapaAtual, setEtapaAtual] = useState<EtapaProdutoForm>("basico");
  const [form, setForm] = useState<ProdutoFormState>(() => criarFormProduto(produtoInicial));

  const produtoEmEdicao = produtoInicial ?? null;

  const atualizarForm = useCallback((dados: Partial<ProdutoFormState>) => {
    setForm((atual) => ({ ...atual, ...dados }));
  }, []);

  const resumoFormulario = useMemo(() => {
    const quantidadeCampos = form.schemaLayout.campos.length;
    const quantidadeObrigatorios = form.schemaLayout.campos.filter((campo) => campo.obrigatorio).length;
    const quantidadeResumo = form.schemaLayout.campos.filter((campo) => campo.visivelNoResumo).length;

    return {
      quantidadeCampos,
      quantidadeObrigatorios,
      quantidadeResumo,
    };
  }, [form.schemaLayout.campos]);

  const indiceEtapaAtual = useMemo(
    () => ETAPAS_FORMULARIO.findIndex((etapa) => etapa.id === etapaAtual),
    [etapaAtual],
  );

  const podeAvancarEtapaAtual = useMemo(() => {
    if (etapaAtual === "basico") {
      return form.nome.trim().length >= 2;
    }

    if (etapaAtual === "campos") {
      return form.schemaLayout.campos.length > 0 && form.schemaLayout.campos.every((campo) => {
        if (campo.label.trim().length === 0) {
          return false;
        }

        if (campo.tipo === "select") {
          return Array.isArray(campo.opcoes) && campo.opcoes.length > 0;
        }

        return true;
      });
    }

    return true;
  }, [etapaAtual, form.nome, form.schemaLayout.campos]);

  const adicionarCampo = useCallback(() => {
    setForm((atual) => ({
      ...atual,
      schemaLayout: {
        ...atual.schemaLayout,
        campos: [...atual.schemaLayout.campos, criarCampoPadrao(atual.schemaLayout.campos.length)],
      },
    }));
    setEtapaAtual("campos");
  }, []);

  const atualizarCampo = useCallback((campoId: string, dados: Record<string, unknown>) => {
    setForm((atual) => ({
      ...atual,
      schemaLayout: {
        ...atual.schemaLayout,
        campos: atual.schemaLayout.campos.map((campo) => (
          campo.id === campoId ? { ...campo, ...dados } as CampoProduto : campo
        )),
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

  const irParaEtapa = useCallback((etapa: EtapaProdutoForm) => {
    const indiceDestino = ETAPAS_FORMULARIO.findIndex((item) => item.id === etapa);
    if (indiceDestino === -1) return;
    if (indiceDestino > indiceEtapaAtual && !podeAvancarEtapaAtual) return;
    setEtapaAtual(etapa);
  }, [indiceEtapaAtual, podeAvancarEtapaAtual]);

  const avancarEtapa = useCallback(() => {
    if (!podeAvancarEtapaAtual) return;
    const proximaEtapa = ETAPAS_FORMULARIO[indiceEtapaAtual + 1];
    if (!proximaEtapa) return;
    setEtapaAtual(proximaEtapa.id);
  }, [indiceEtapaAtual, podeAvancarEtapaAtual]);

  const voltarEtapa = useCallback(() => {
    const etapaAnterior = ETAPAS_FORMULARIO[indiceEtapaAtual - 1];
    if (!etapaAnterior) return;
    setEtapaAtual(etapaAnterior.id);
  }, [indiceEtapaAtual]);

  const voltarCatalogo = useCallback(() => {
    router.push("/produtos");
  }, [router]);

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

    setSalvando(false);
    router.push("/produtos");
  }, [addToast, payload, produtoEmEdicao, router]);

  return {
    produtoEmEdicao,
    form,
    erro,
    salvando,
    etapaAtual,
    indiceEtapaAtual,
    etapas: ETAPAS_FORMULARIO,
    podeAvancarEtapaAtual,
    resumoFormulario,
    atualizarForm,
    adicionarCampo,
    atualizarCampo,
    removerCampo,
    moverCampo,
    irParaEtapa,
    avancarEtapa,
    voltarEtapa,
    voltarCatalogo,
    salvarProduto,
  };
}
