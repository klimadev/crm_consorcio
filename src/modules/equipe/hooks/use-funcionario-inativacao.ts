"use client";

import { useCallback, useMemo, useState } from "react";
import { inativarFuncionario as inativarFuncionarioApi } from "@/lib/api/equipe";
import type { Funcionario, FuncionarioDestinoInativacao } from "../types";

type UseFuncionarioInativacaoParams = {
  funcionarios: Funcionario[];
  funcionariosAtivosParaDestino: Funcionario[];
  setFuncionarios: React.Dispatch<React.SetStateAction<Funcionario[]>>;
  setErroLista: React.Dispatch<React.SetStateAction<string | null>>;
  carregarFuncionarios: () => Promise<void>;
};

type UseFuncionarioInativacaoReturn = {
  dialogInativacaoAberto: boolean;
  setDialogInativacaoAberto: React.Dispatch<React.SetStateAction<boolean>>;
  funcionariosDestinoInativacao: FuncionarioDestinoInativacao | null;
  funcionariosDestinoMesmoPdv: Funcionario[];
  destinoInativacaoIndividual: string;
  setDestinoInativacaoIndividual: React.Dispatch<React.SetStateAction<string>>;
  observacaoInativacaoIndividual: string;
  setObservacaoInativacaoIndividual: React.Dispatch<React.SetStateAction<string>>;
  executandoInativacaoIndividual: boolean;
  abrirModalInativacao: (funcionario: Funcionario) => void;
  confirmarInativacaoIndividual: () => Promise<void>;
};

export function useFuncionarioInativacao({
  funcionarios,
  funcionariosAtivosParaDestino,
  setFuncionarios,
  setErroLista,
  carregarFuncionarios,
}: UseFuncionarioInativacaoParams): UseFuncionarioInativacaoReturn {
  const [dialogInativacaoAberto, setDialogInativacaoAberto] = useState(false);
  const [funcionarioDestinoInativacao, setFuncionarioDestinoInativacao] = useState<FuncionarioDestinoInativacao | null>(null);
  const [destinoInativacaoIndividual, setDestinoInativacaoIndividual] = useState("");
  const [observacaoInativacaoIndividual, setObservacaoInativacaoIndividual] = useState("");
  const [executandoInativacaoIndividual, setExecutandoInativacaoIndividual] = useState(false);

  const funcionariosDestinoMesmoPdv = useMemo(() => {
    if (!funcionarioDestinoInativacao) return [];
    const origem = funcionarios.find((funcionario) => funcionario.id === funcionarioDestinoInativacao.id);
    if (!origem?.pdv?.id) return [];

    return funcionarios.filter(
      (funcionario) =>
        funcionario.ativo && funcionario.id !== funcionarioDestinoInativacao.id && funcionario.pdv?.id === origem.pdv.id,
    );
  }, [funcionarios, funcionarioDestinoInativacao]);

  const inativarFuncionario = useCallback(
    async (id: string, destino: string, obs?: string) => {
      if (!destino) {
        setErroLista("Selecione um colaborador de destino para reatribuicao.");
        return false;
      }

      if (destino === id) {
        setErroLista("O destino da reatribuicao precisa ser diferente do colaborador deletado.");
        return false;
      }

      const funcionarioAnterior = funcionarios.find((item) => item.id === id);
      if (!funcionarioAnterior) {
        return false;
      }

      setErroLista(null);
      setFuncionarios((atual) => atual.filter((item) => item.id !== id));

      const resultado = await inativarFuncionarioApi(id, {
        id_funcionario_destino: destino,
        observacao: obs || undefined,
      });

      if (!resultado.ok) {
        setErroLista(resultado.erro);
        setFuncionarios((atual) => [...atual, funcionarioAnterior]);
        return false;
      }

      void carregarFuncionarios();
      return true;
    },
    [carregarFuncionarios, funcionarios, setErroLista, setFuncionarios],
  );

  const abrirModalInativacao = useCallback(
    (funcionario: Funcionario) => {
      const destinoMesmoPdv = funcionariosAtivosParaDestino.filter(
        (item) => item.id !== funcionario.id && item.pdv?.id === funcionario.pdv?.id,
      );
      const destinoAutomatico = destinoMesmoPdv[0];

      setFuncionarioDestinoInativacao({ id: funcionario.id, nome: funcionario.nome });
      setDestinoInativacaoIndividual(destinoAutomatico?.id ?? "");
      setObservacaoInativacaoIndividual("");
      setErroLista(destinoAutomatico ? null : "Nenhum colaborador no mesmo PDV. Atribua a um gerente geral.");
      setDialogInativacaoAberto(true);
    },
    [funcionariosAtivosParaDestino, setErroLista],
  );

  const confirmarInativacaoIndividual = useCallback(async () => {
    if (!funcionarioDestinoInativacao) {
      return;
    }

    setExecutandoInativacaoIndividual(true);
    const ok = await inativarFuncionario(
      funcionarioDestinoInativacao.id,
      destinoInativacaoIndividual,
      observacaoInativacaoIndividual.trim() || undefined,
    );
    setExecutandoInativacaoIndividual(false);
    if (ok) {
      setDialogInativacaoAberto(false);
      setFuncionarioDestinoInativacao(null);
    }
  }, [funcionarioDestinoInativacao, destinoInativacaoIndividual, observacaoInativacaoIndividual, inativarFuncionario]);

  return {
    dialogInativacaoAberto,
    setDialogInativacaoAberto,
    funcionariosDestinoInativacao: funcionarioDestinoInativacao,
    funcionariosDestinoMesmoPdv,
    destinoInativacaoIndividual,
    setDestinoInativacaoIndividual,
    observacaoInativacaoIndividual,
    setObservacaoInativacaoIndividual,
    executandoInativacaoIndividual,
    abrirModalInativacao,
    confirmarInativacaoIndividual,
  };
}
