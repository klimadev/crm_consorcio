"use client";

import { useCallback, useState } from "react";
import { executarAcaoLoteEquipe } from "@/lib/api/equipe";
import type { AcaoLote, Funcionario, ResultadoLote } from "../types";

type UseEquipeLoteParams = {
  idsSelecionados: string[];
  setIdsSelecionados: React.Dispatch<React.SetStateAction<string[]>>;
  funcionarios: Funcionario[];
  carregarFuncionarios: () => Promise<void>;
};

type UseEquipeLoteReturn = {
  idsSelecionados: string[];
  setIdsSelecionados: React.Dispatch<React.SetStateAction<string[]>>;
  executandoLote: boolean;
  resultadoLote: ResultadoLote | null;
  erroLote: string | null;
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
}: UseEquipeLoteParams): UseEquipeLoteReturn {
  const [executandoLote, setExecutandoLote] = useState(false);
  const [resultadoLote, setResultadoLote] = useState<ResultadoLote | null>(null);
  const [erroLote, setErroLote] = useState<string | null>(null);
  const [acaoLote, setAcaoLote] = useState<AcaoLote>("ATIVAR");
  const [cargoLote, setCargoLote] = useState("COLABORADOR");
  const [pdvLote, setPdvLote] = useState("");
  const [destinoInativacaoLote, setDestinoInativacaoLote] = useState("");
  const [observacaoLote, setObservacaoLote] = useState("");

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
    if (idsSelecionados.length === 0) {
      setErroLote("Selecione ao menos um colaborador.");
      return;
    }

    if (acaoLote === "ALTERAR_CARGO" && !cargoLote) {
      setErroLote("Informe o cargo para alteracao em lote.");
      return;
    }

    if (acaoLote === "ALTERAR_PDV" && !pdvLote) {
      setErroLote("Informe o PDV para alteracao em lote.");
      return;
    }

    if (acaoLote === "INATIVAR" && !destinoInativacaoLote) {
      setErroLote("Selecione um destino para inativacao em lote.");
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
      return;
    }

    setResultadoLote(resultado.dados);
    setExecutandoLote(false);
    setIdsSelecionados([]);
    void carregarFuncionarios();
  }, [
    idsSelecionados,
    acaoLote,
    cargoLote,
    pdvLote,
    destinoInativacaoLote,
    observacaoLote,
    carregarFuncionarios,
    setIdsSelecionados,
  ]);

  return {
    idsSelecionados,
    setIdsSelecionados,
    executandoLote,
    resultadoLote,
    erroLote,
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
