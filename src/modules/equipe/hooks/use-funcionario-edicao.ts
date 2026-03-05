"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { editarFuncionario } from "@/lib/api/equipe";
import { CARGOS_EQUIPE } from "../constants";
import type { DadosEdicao, ErrosEdicao, Funcionario, Pdv, StatusSalvamento } from "../types";

function extrairDadosEdicao(funcionario: Funcionario): DadosEdicao {
  return {
    nome: funcionario.nome,
    email: funcionario.email,
    cargo: funcionario.cargo,
    id_pdv: funcionario.pdv?.id ?? "",
  };
}

function validarDadosEdicao(dados: DadosEdicao): ErrosEdicao {
  const erros: ErrosEdicao = {};

  if (dados.nome.trim().length < 2) {
    erros.nome = "Nome deve ter ao menos 2 caracteres.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email.trim())) {
    erros.email = "E-mail invalido.";
  }

  if (!CARGOS_EQUIPE.includes(dados.cargo as (typeof CARGOS_EQUIPE)[number])) {
    erros.cargo = "Cargo invalido.";
  }

  if (!dados.id_pdv.trim()) {
    erros.id_pdv = "PDV obrigatorio.";
  }

  return erros;
}

function atualizarFuncionarioNaLista(item: Funcionario, dados: DadosEdicao, pdvs: Pdv[]): Funcionario {
  const pdvAtualizado = pdvs.find((pdv) => pdv.id === dados.id_pdv);

  return {
    ...item,
    nome: dados.nome,
    email: dados.email,
    cargo: dados.cargo,
    pdv: {
      id: dados.id_pdv,
      nome: pdvAtualizado?.nome ?? item.pdv?.nome ?? "",
    },
  };
}

type UseFuncionarioEdicaoParams = {
  pdvs: Pdv[];
  setFuncionarios: React.Dispatch<React.SetStateAction<Funcionario[]>>;
  addToast: (toast: { type: "success" | "info" | "warning" | "error"; title: string; description?: string; duration?: number }) => void;
};

type UseFuncionarioEdicaoReturn = {
  editandoId: string | null;
  setEditandoId: React.Dispatch<React.SetStateAction<string | null>>;
  editandoFuncionario: Funcionario | null;
  drawerEdicaoAberto: boolean;
  fecharDrawerEdicao: () => void;
  dadosEdicao: DadosEdicao | null;
  setDadosEdicao: React.Dispatch<React.SetStateAction<DadosEdicao | null>>;
  errosEdicao: ErrosEdicao;
  statusSalvamento: StatusSalvamento;
  ultimoSnapshot: { id: string; dados: DadosEdicao } | null;
  temAlteracoesNaoSalvas: boolean;
  iniciarEdicao: (funcionario: Funcionario) => void;
  cancelarEdicao: () => void;
  aoMudarDado: (campo: keyof DadosEdicao, valor: string) => void;
  salvarEdicaoAtual: (dadosOverride?: DadosEdicao) => Promise<boolean>;
  desfazerUltimaEdicao: () => Promise<void>;
};

export function useFuncionarioEdicao({ pdvs, setFuncionarios, addToast }: UseFuncionarioEdicaoParams): UseFuncionarioEdicaoReturn {
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoFuncionario, setEditandoFuncionario] = useState<Funcionario | null>(null);
  const [drawerEdicaoAberto, setDrawerEdicaoAberto] = useState(false);
  const [dadosEdicao, setDadosEdicao] = useState<DadosEdicao | null>(null);
  const [errosEdicao, setErrosEdicao] = useState<ErrosEdicao>({});
  const [statusSalvamento, setStatusSalvamento] = useState<StatusSalvamento>({ id: null, estado: "idle" });
  const [ultimoSnapshot, setUltimoSnapshot] = useState<{ id: string; dados: DadosEdicao } | null>(null);
  const [temAlteracoesNaoSalvas, setTemAlteracoesNaoSalvas] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const limparTimerAutoSave = useCallback(() => {
    if (!timeoutRef.current) {
      return;
    }
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  const limparTimerStatus = useCallback(() => {
    if (!statusTimeoutRef.current) {
      return;
    }
    clearTimeout(statusTimeoutRef.current);
    statusTimeoutRef.current = null;
  }, []);

  const salvarFuncionario = useCallback(
    async (id: string, dados: DadosEdicao) => {
      const erros = validarDadosEdicao(dados);
      if (Object.keys(erros).length > 0) {
        setErrosEdicao(erros);
        setStatusSalvamento({
          id,
          estado: "error",
          mensagem: "Corrija os campos destacados.",
        });
        return false;
      }

      setStatusSalvamento({ id, estado: "saving", mensagem: "Salvando alteracoes..." });

      let funcionarioAnterior: Funcionario | null = null;
      let encontrouFuncionarioNaLista = false;

      setFuncionarios((atual) =>
        atual.map((item) => {
          if (item.id !== id) {
            return item;
          }

          encontrouFuncionarioNaLista = true;
          funcionarioAnterior = item;
          return atualizarFuncionarioNaLista(item, dados, pdvs);
        }),
      );

      try {
        const resultado = await editarFuncionario(id, dados);

        if (!resultado.ok) {
          if (encontrouFuncionarioNaLista && funcionarioAnterior) {
            setFuncionarios((atual) => atual.map((item) => (item.id === id ? funcionarioAnterior ?? item : item)));
          }
          setStatusSalvamento({
            id,
            estado: "error",
            mensagem: resultado.erro,
          });
          return false;
        }

        if (funcionarioAnterior) {
          setUltimoSnapshot({ id, dados: extrairDadosEdicao(funcionarioAnterior) });
        }
        setStatusSalvamento({ id, estado: "saved", mensagem: "Alteracoes salvas." });
        setTemAlteracoesNaoSalvas(false);

        addToast({
          type: "success",
          title: "Alterações salvas",
          duration: 2000,
        });

        limparTimerStatus();
        statusTimeoutRef.current = setTimeout(() => {
          setStatusSalvamento((atual) => (atual.id === id ? { id, estado: "idle" } : atual));
        }, 2000);

        return true;
      } catch {
        if (encontrouFuncionarioNaLista && funcionarioAnterior) {
          setFuncionarios((atual) => atual.map((item) => (item.id === id ? funcionarioAnterior ?? item : item)));
        }
        setStatusSalvamento({ id, estado: "error", mensagem: "Erro ao salvar alteracoes." });
        return false;
      }
    },
    [addToast, limparTimerStatus, pdvs, setFuncionarios],
  );

  const iniciarEdicao = useCallback(
    (funcionario: Funcionario) => {
      limparTimerAutoSave();
      setEditandoFuncionario(funcionario);
      setEditandoId(funcionario.id);
      setDadosEdicao(extrairDadosEdicao(funcionario));
      setErrosEdicao({});
      setStatusSalvamento({ id: null, estado: "idle" });
      setDrawerEdicaoAberto(true);
    },
    [limparTimerAutoSave],
  );

  const fecharDrawerEdicao = useCallback(() => {
    setDrawerEdicaoAberto(false);
    setEditandoFuncionario(null);
    setEditandoId(null);
    setDadosEdicao(null);
    setErrosEdicao({});
    setStatusSalvamento({ id: null, estado: "idle" });
    setTemAlteracoesNaoSalvas(false);
  }, []);

  const cancelarEdicao = useCallback(() => {
    limparTimerAutoSave();
    setEditandoId(null);
    setDadosEdicao(null);
    setErrosEdicao({});
    setStatusSalvamento({ id: null, estado: "idle" });
    setTemAlteracoesNaoSalvas(false);
  }, [limparTimerAutoSave]);

  const aoMudarDado = useCallback(
    (campo: keyof DadosEdicao, valor: string) => {
      if (!dadosEdicao || !editandoId) {
        return;
      }

      const novosDados: DadosEdicao = {
        ...dadosEdicao,
        [campo]: valor,
      };

      setDadosEdicao(novosDados);
      setTemAlteracoesNaoSalvas(true);

      const erros = validarDadosEdicao(novosDados);
      setErrosEdicao(erros);

      limparTimerAutoSave();

      if (Object.keys(erros).length > 0) {
        setStatusSalvamento({
          id: editandoId,
          estado: "error",
          mensagem: "Corrija os campos destacados.",
        });
        return;
      }

      setStatusSalvamento({ id: editandoId, estado: "idle" });
      timeoutRef.current = setTimeout(() => {
        addToast({
          type: "info",
          title: "Salvando alterações...",
          duration: 800,
        });
        void salvarFuncionario(editandoId, novosDados);
      }, 700);
    },
    [addToast, dadosEdicao, editandoId, limparTimerAutoSave, salvarFuncionario],
  );

  const desfazerUltimaEdicao = useCallback(async () => {
    if (!editandoId || !ultimoSnapshot || ultimoSnapshot.id !== editandoId) {
      return;
    }

    const erros = validarDadosEdicao(ultimoSnapshot.dados);
    if (Object.keys(erros).length > 0) {
      setErrosEdicao(erros);
      return;
    }

    limparTimerAutoSave();
    setDadosEdicao(ultimoSnapshot.dados);
    setErrosEdicao({});
    await salvarFuncionario(editandoId, ultimoSnapshot.dados);
  }, [editandoId, ultimoSnapshot, limparTimerAutoSave, salvarFuncionario]);

  const salvarEdicaoAtual = useCallback(
    async (dadosOverride?: DadosEdicao) => {
      if (!editandoId) {
        return false;
      }

      const dadosParaSalvar = dadosOverride ?? dadosEdicao;
      if (!dadosParaSalvar) {
        return false;
      }

      const ok = await salvarFuncionario(editandoId, dadosParaSalvar);
      if (ok) {
        fecharDrawerEdicao();
      }
      return ok;
    },
    [dadosEdicao, editandoId, fecharDrawerEdicao, salvarFuncionario],
  );

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (temAlteracoesNaoSalvas) {
        event.preventDefault();
        event.returnValue = "Você tem alterações não salvas. Deseja sair?";
        return event.returnValue;
      }
      return undefined;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [temAlteracoesNaoSalvas]);

  useEffect(() => {
    return () => {
      limparTimerAutoSave();
      limparTimerStatus();
    };
  }, [limparTimerAutoSave, limparTimerStatus]);

  return {
    editandoId,
    setEditandoId,
    editandoFuncionario,
    drawerEdicaoAberto,
    fecharDrawerEdicao,
    dadosEdicao,
    setDadosEdicao,
    errosEdicao,
    statusSalvamento,
    ultimoSnapshot,
    temAlteracoesNaoSalvas,
    iniciarEdicao,
    cancelarEdicao,
    aoMudarDado,
    salvarEdicaoAtual,
    desfazerUltimaEdicao,
  };
}
