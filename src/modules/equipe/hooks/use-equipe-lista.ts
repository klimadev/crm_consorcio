"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Funcionario, KpisEquipe, Paginacao } from "../types";
import { listarEquipe } from "@/lib/api/equipe";

type UseEquipeListaParams = {
  searchParams: { toString: () => string };
  idsSelecionados: string[];
  setIdsSelecionados: React.Dispatch<React.SetStateAction<string[]>>;
};

type UseEquipeListaReturn = {
  funcionarios: Funcionario[];
  setFuncionarios: React.Dispatch<React.SetStateAction<Funcionario[]>>;
  paginacao: Paginacao;
  kpis: KpisEquipe;
  kpisTotais: KpisEquipe;
  carregandoLista: boolean;
  atualizando: boolean;
  setAtualizando: React.Dispatch<React.SetStateAction<boolean>>;
  erroLista: string | null;
  setErroLista: React.Dispatch<React.SetStateAction<string | null>>;
  carregarFuncionarios: () => Promise<void>;
  contadoresFiltro: {
    status: Record<string, number>;
    cargo: Record<string, number>;
  };
  funcionariosAtivosParaDestino: Funcionario[];
  todosDaPaginaSelecionados: boolean;
};

export function useEquipeLista({
  searchParams,
  idsSelecionados,
  setIdsSelecionados,
}: UseEquipeListaParams): UseEquipeListaReturn {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [paginacao, setPaginacao] = useState<Paginacao>({
    pagina: 1,
    por_pagina: 20,
    total: 0,
    total_paginas: 1,
  });
  const [kpis, setKpis] = useState<KpisEquipe>({
    total: 0,
    ativos: 0,
    inativos: 0,
    gerentes: 0,
    colaboradores: 0,
  });
  const [kpisTotais, setKpisTotais] = useState<KpisEquipe>({
    total: 0,
    ativos: 0,
    inativos: 0,
    gerentes: 0,
    colaboradores: 0,
  });
  const [carregandoLista, setCarregandoLista] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const [erroLista, setErroLista] = useState<string | null>(null);

  const carregarFuncionarios = useCallback(async () => {
    setCarregandoLista(true);
    setErroLista(null);

    try {
      const resposta = await listarEquipe(searchParams.toString());
      if (!resposta.ok) {
        setErroLista(resposta.erro);
        return;
      }

      const lista = resposta.dados.funcionarios;
      setFuncionarios(lista);
      setPaginacao(resposta.dados.paginacao);

      const kpisCalculados = resposta.dados.kpis;
      const kpisTotaisCalculados = resposta.dados.kpis_totais ?? kpisCalculados;

      setKpis(kpisCalculados);
      setKpisTotais(kpisTotaisCalculados);

      setIdsSelecionados((atual) => atual.filter((id) => lista.some((funcionario) => funcionario.id === id)));
    } finally {
      setCarregandoLista(false);
    }
  }, [searchParams, setIdsSelecionados]);

  useEffect(() => {
    void carregarFuncionarios();
  }, [carregarFuncionarios]);

  const contadoresFiltro = useMemo(() => {
    const todos = funcionarios;
    const ativos = todos.filter((f) => f.ativo);
    const inativos = todos.filter((f) => !f.ativo);
    const colaboradores = todos.filter((f) => f.cargo === "COLABORADOR");
    const gerentes = todos.filter((f) => f.cargo === "GERENTE");
    const administradores = todos.filter((f) => f.cargo === "ADMINISTRADOR");

    return {
      status: {
        TODOS: todos.length,
        ATIVO: ativos.length,
        INATIVO: inativos.length,
      },
      cargo: {
        TODOS: todos.length,
        COLABORADOR: colaboradores.length,
        GERENTE: gerentes.length,
        ADMINISTRADOR: administradores.length,
      },
    };
  }, [funcionarios]);

  const funcionariosAtivosParaDestino = useMemo(
    () => funcionarios.filter((funcionario) => funcionario.ativo),
    [funcionarios],
  );

  const todosDaPaginaSelecionados = useMemo(
    () => funcionarios.length > 0 && funcionarios.every((item) => idsSelecionados.includes(item.id)),
    [funcionarios, idsSelecionados],
  );

  return {
    funcionarios,
    setFuncionarios,
    paginacao,
    kpis,
    kpisTotais,
    carregandoLista,
    atualizando,
    setAtualizando,
    erroLista,
    setErroLista,
    carregarFuncionarios,
    contadoresFiltro,
    funcionariosAtivosParaDestino,
    todosDaPaginaSelecionados,
  };
}
