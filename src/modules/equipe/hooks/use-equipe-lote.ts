"use client";

import { useCallback, useState } from "react";
import { executarAcaoLoteEquipe } from "@/lib/api/equipe";
import type { AcaoLote, Funcionario, ResultadoLote } from "../types";

type UseEquipeLoteParams = {
  idsSelecionados: string[];
  setIdsSelecionados: React.Dispatch<React.SetStateAction<string[]>>;
  funcionarios: Funcionario[];
  carregarFuncionarios: () => Promise<void>;
  carregarPdvs: () => Promise<void>;
  addToast: (toast: { type: "success" | "info" | "warning" | "error"; title: string; description?: string; duration?: number }) => void;
};

type UseEquipeLoteReturn = {
  idsSelecionados: string[];
  setIdsSelecionados: React.Dispatch<React.SetStateAction<string[]>>;
  executandoLote: boolean;
  resultadoLote: ResultadoLote | null;
  erroLote: string | null;
  lotePodeExecutar: boolean;
  loteResumoAcao: string;
  lotePendencia: string | null;
  acaoLote: AcaoLote;
  setAcaoLote: React.Dispatch<React.SetStateAction<AcaoLote>>;
  cargoLote: string;
  setCargoLote: React.Dispatch<React.SetStateAction<string>>;
  pdvLote: string;
  setPdvLote: React.Dispatch<React.SetStateAction<string>>;
  destinoInativacaoLote: string;
  setDestinoInativacaoLote: React.Dispatch<React.SetStateAction<string>>;
  observacaoLote: string;
  setObservacaoLote: React.Dispatch<React.SetStateAction<string>>;
  alternarSelecao: (id: string, marcado: boolean) => void;
  alternarSelecaoPagina: (marcado: boolean) => void;
  executarAcaoLote: () => Promise<void>;
};

export function useEquipeLote({
  idsSelecionados,
  setIdsSelecionados,
  funcionarios,
  carregarFuncionarios,
  carregarPdvs,
  addToast,
}: UseEquipeLoteParams): UseEquipeLoteReturn {
  const [executandoLote, setExecutandoLote] = useState(false);
  const [resultadoLote, setResultadoLote] = useState<ResultadoLote | null>(null);
  const [erroLote, setErroLote] = useState<string | null>(null);
  const [acaoLote, setAcaoLote] = useState<AcaoLote>("ATIVAR");
  const [cargoLote, setCargoLote] = useState("COLABORADOR");
  const [pdvLote, setPdvLote] = useState("");
  const [destinoInativacaoLote, setDestinoInativacaoLote] = useState("");
  const [observacaoLote, setObservacaoLote] = useState("");
  const totalSelecionados = idsSelecionados.length;
  const lotePendencia =
    totalSelecionados === 0
      ? "Selecione ao menos um colaborador."
      : acaoLote === "ALTERAR_CARGO" && !cargoLote
        ? "Escolha o novo cargo antes de aplicar."
        : acaoLote === "ALTERAR_PDV" && !pdvLote
          ? "Escolha o PDV de destino antes de aplicar."
          : acaoLote === "INATIVAR" && !destinoInativacaoLote
            ? "Selecione quem recebera os leads antes de inativar."
            : null;
  const lotePodeExecutar = lotePendencia === null;
  const loteResumoAcao =
    acaoLote === "ATIVAR"
      ? `Reativar ${totalSelecionados} colaborador(es) selecionado(s).`
      : acaoLote === "INATIVAR"
        ? `Inativar ${totalSelecionados} colaborador(es) com reatribuicao de leads.`
        : acaoLote === "ALTERAR_CARGO"
          ? `Alterar o cargo de ${totalSelecionados} colaborador(es).`
          : `Mover ${totalSelecionados} colaborador(es) para outro PDV.`;

  const alternarSelecao = useCallback((id: string, marcado: boolean) => {
    setIdsSelecionados((atual) => {
      if (marcado) {
        return Array.from(new Set([...atual, id]));
      }

      return atual.filter((item) => item !== id);
    });
  }, [setIdsSelecionados]);

  const alternarSelecaoPagina = useCallback(
    (marcado: boolean) => {
      if (marcado) {
        setIdsSelecionados((atual) => Array.from(new Set([...atual, ...funcionarios.map((item) => item.id)])));
        return;
      }

      setIdsSelecionados((atual) => atual.filter((id) => !funcionarios.some((item) => item.id === id)));
    },
    [funcionarios, setIdsSelecionados],
  );

  const executarAcaoLote = useCallback(async () => {
    if (lotePendencia) {
      setErroLote(lotePendencia);
      addToast({
        type: "warning",
        title: "Ação incompleta",
        description: lotePendencia,
        duration: 3500,
      });
      return;
    }

    setExecutandoLote(true);
    setErroLote(null);
    setResultadoLote(null);

    const payload: {
      ids: string[];
      acao: AcaoLote;
      cargo?: string;
      id_pdv?: string;
      id_funcionario_destino?: string;
      observacao?: string;
    } = {
      ids: idsSelecionados,
      acao: acaoLote,
    };

    if (acaoLote === "ALTERAR_CARGO") {
      payload.cargo = cargoLote;
    }

    if (acaoLote === "ALTERAR_PDV") {
      payload.id_pdv = pdvLote;
    }

    if (acaoLote === "INATIVAR") {
      payload.id_funcionario_destino = destinoInativacaoLote;
      if (observacaoLote.trim()) {
        payload.observacao = observacaoLote.trim();
      }
    }

    const resultado = await executarAcaoLoteEquipe(payload);

    if (!resultado.ok) {
      setErroLote(resultado.erro);
      setExecutandoLote(false);
      addToast({
        type: "error",
        title: "Não foi possível aplicar a ação",
        description: resultado.erro,
        duration: 4500,
      });
      return;
    }

    setResultadoLote(resultado.dados);
    setExecutandoLote(false);
    setIdsSelecionados([]);
    addToast({
      type: "success",
      title: "Ação aplicada",
      description: `${resultado.dados.atualizados} colaborador(es) atualizado(s).`,
      duration: 3500,
    });
    void Promise.all([carregarFuncionarios(), carregarPdvs()]);
  }, [
    acaoLote,
    addToast,
    cargoLote,
    carregarFuncionarios,
    carregarPdvs,
    idsSelecionados,
    pdvLote,
    destinoInativacaoLote,
    lotePendencia,
    observacaoLote,
    setIdsSelecionados,
  ]);

  return {
    idsSelecionados,
    setIdsSelecionados,
    executandoLote,
    resultadoLote,
    erroLote,
    lotePodeExecutar,
    loteResumoAcao,
    lotePendencia,
    acaoLote,
    setAcaoLote,
    cargoLote,
    setCargoLote,
    pdvLote,
    setPdvLote,
    destinoInativacaoLote,
    setDestinoInativacaoLote,
    observacaoLote,
    setObservacaoLote,
    alternarSelecao,
    alternarSelecaoPagina,
    executarAcaoLote,
  };
}
