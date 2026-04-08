"use client";

import { useCallback, useMemo, useState } from "react";
import { executarAcaoLoteEquipe, inativarFuncionario as inativarFuncionarioApi } from "@/lib/api/equipe";
import type { Funcionario, FuncionarioDestinoInativacao } from "../types";

type UseFuncionarioInativacaoParams = {
  funcionarios: Funcionario[];
  funcionariosAtivosParaDestino: Funcionario[];
  setFuncionarios: React.Dispatch<React.SetStateAction<Funcionario[]>>;
  setErroLista: React.Dispatch<React.SetStateAction<string | null>>;
  carregarFuncionarios: () => Promise<void>;
  carregarPdvs: () => Promise<void>;
  addToast: (toast: { type: "success" | "info" | "warning" | "error"; title: string; description?: string; duration?: number }) => void;
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
  erroInativacaoIndividual: string | null;
  abrirModalInativacao: (funcionario: Funcionario) => void;
  confirmarInativacaoIndividual: () => Promise<void>;
  reativarFuncionarioIndividual: (funcionario: Funcionario) => Promise<void>;
};

export function useFuncionarioInativacao({
  funcionarios,
  funcionariosAtivosParaDestino,
  setFuncionarios,
  setErroLista,
  carregarFuncionarios,
  carregarPdvs,
  addToast,
}: UseFuncionarioInativacaoParams): UseFuncionarioInativacaoReturn {
  const [dialogInativacaoAberto, setDialogInativacaoAberto] = useState(false);
  const [funcionarioDestinoInativacao, setFuncionarioDestinoInativacao] = useState<FuncionarioDestinoInativacao | null>(null);
  const [destinoInativacaoIndividual, setDestinoInativacaoIndividual] = useState("");
  const [observacaoInativacaoIndividual, setObservacaoInativacaoIndividual] = useState("");
  const [executandoInativacaoIndividual, setExecutandoInativacaoIndividual] = useState(false);
  const [erroInativacaoIndividual, setErroInativacaoIndividual] = useState<string | null>(null);

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
        setErroInativacaoIndividual("Selecione um colaborador de destino para reatribuicao.");
        return false;
      }

      if (destino === id) {
        setErroInativacaoIndividual("O destino da reatribuicao precisa ser diferente do colaborador inativado.");
        return false;
      }

      const funcionarioAnterior = funcionarios.find((item) => item.id === id);
      if (!funcionarioAnterior) {
        return false;
      }

      setErroLista(null);
      setErroInativacaoIndividual(null);
      setFuncionarios((atual) => atual.map((item) => (item.id === id ? { ...item, ativo: false } : item)));

      const resultado = await inativarFuncionarioApi(id, {
        id_funcionario_destino: destino,
        observacao: obs || undefined,
      });

      if (!resultado.ok) {
        setErroInativacaoIndividual(resultado.erro);
        setFuncionarios((atual) => atual.map((item) => (item.id === id ? funcionarioAnterior : item)));
        addToast({
          type: "error",
          title: "Não foi possível inativar",
          description: resultado.erro,
          duration: 4500,
        });
        return false;
      }

      addToast({
        type: "success",
        title: "Colaborador inativado",
        description: "Os leads foram reatribuídos e o colaborador pode ser reativado depois.",
        duration: 4000,
      });
      void Promise.all([carregarFuncionarios(), carregarPdvs()]);
      return true;
    },
    [addToast, carregarFuncionarios, carregarPdvs, funcionarios, setErroLista, setFuncionarios],
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
      setErroInativacaoIndividual(destinoAutomatico ? null : "Nenhum colaborador ativo no mesmo PDV para receber os leads.");
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
      setErroInativacaoIndividual(null);
    }
  }, [funcionarioDestinoInativacao, destinoInativacaoIndividual, observacaoInativacaoIndividual, inativarFuncionario]);

  const reativarFuncionarioIndividual = useCallback(
    async (funcionario: Funcionario) => {
      setErroInativacaoIndividual(null);
      setFuncionarios((atual) => atual.map((item) => (item.id === funcionario.id ? { ...item, ativo: true } : item)));

      const resultado = await executarAcaoLoteEquipe({
        ids: [funcionario.id],
        acao: "ATIVAR",
      });

      if (!resultado.ok) {
        setFuncionarios((atual) => atual.map((item) => (item.id === funcionario.id ? funcionario : item)));
        addToast({
          type: "error",
          title: "Não foi possível reativar",
          description: resultado.erro,
          duration: 4500,
        });
        return;
      }

      addToast({
        type: "success",
        title: "Colaborador reativado",
        description: `${funcionario.nome} voltou a ficar disponível neste PDV.`,
        duration: 3500,
      });
      void Promise.all([carregarFuncionarios(), carregarPdvs()]);
    },
    [addToast, carregarFuncionarios, carregarPdvs, setFuncionarios],
  );

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
    erroInativacaoIndividual,
    abrirModalInativacao,
    confirmarInativacaoIndividual,
    reativarFuncionarioIndividual,
  };
}
