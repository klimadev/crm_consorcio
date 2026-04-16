"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { buscarResumo } from "@/lib/api/resumo";
import { formataMoeda } from "@/lib/utils";
import type { ResumoResposta } from "@/lib/api/resumo";
import type { UseResumoModuleProps, UseResumoModuleReturn } from "../types";

export function useResumoModule({ perfil }: UseResumoModuleProps): UseResumoModuleReturn {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [dados, setDados] = useState<ResumoResposta | null>(null);
  const [chaveRecarga, setChaveRecarga] = useState(0);
  const [periodoSelecionado, setPeriodoSelecionado] = useState<"todo" | "mensal" | "semanal">("mensal");

  const carregar = useCallback(async () => {
    setCarregando(true);
    const resultado = await buscarResumo({ periodo: periodoSelecionado });
    if (!resultado.ok) {
      setErro(resultado.erro);
      setDados(null);
      setCarregando(false);
      return;
    }
    setDados(resultado.dados);
    setErro(null);
    setCarregando(false);
  }, [periodoSelecionado]);

  useEffect(() => {
    // Carregamento inicial do painel
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void carregar();
  }, [carregar, chaveRecarga]);

  const kpis = useMemo(() => {
    if (!dados) return [];
    return [
      { id: "negocios", rotulo: "Total negocios", valor: String(dados.resumo.totalNegocios), apoio: `${dados.variacoes.negocios >= 0 ? "+" : ""}${dados.variacoes.negocios.toFixed(1)}% vs periodo anterior`, tom: "blue" as const },
      { id: "ganhos", rotulo: "Total ganhos", valor: formataMoeda(dados.resumo.totalGanhosValor), apoio: `${dados.resumo.totalGanhosQuantidade} negocios ganhos`, tom: "emerald" as const, tendencia: `${dados.variacoes.ganhos >= 0 ? "+" : ""}${dados.variacoes.ganhos.toFixed(1)}% vs periodo anterior` },
      { id: "perdidos", rotulo: "Total perdidos", valor: formataMoeda(dados.resumo.totalPerdidosValor), apoio: `${dados.resumo.totalPerdidosQuantidade} negocios perdidos`, tom: "rose" as const, tendencia: `${dados.variacoes.perdidos >= 0 ? "+" : ""}${dados.variacoes.perdidos.toFixed(1)}% vs periodo anterior` },
      { id: "aberto", rotulo: "Total em aberto", valor: formataMoeda(dados.resumo.totalEmAbertoValor), apoio: `${dados.resumo.totalEmAbertoQuantidade} negocios em aberto`, tom: "amber" as const, tendencia: `${dados.variacoes.aberto >= 0 ? "+" : ""}${dados.variacoes.aberto.toFixed(1)}% vs periodo anterior` },
    ];
  }, [dados]);

  return {
    carregando,
    erro,
    dados,
    kpis,
    perfil,
    recarregar: async () => setChaveRecarga((atual) => atual + 1),
    periodoSelecionado,
    setPeriodoSelecionado,
  };
}
