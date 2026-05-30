"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { criarFuncionario } from "@/lib/api/equipe";
import type { Funcionario, Props, UseEquipeModuleReturn } from "../types";
import { useEquipeFiltros } from "./use-equipe-filtros";
import { useEquipeLista } from "./use-equipe-lista";
import { useFuncionarioEdicao } from "./use-funcionario-edicao";
import { useFuncionarioInativacao } from "./use-funcionario-inativacao";
import { usePdvManagement } from "./use-pdv-management";
import { useEquipeLote } from "./use-equipe-lote";

export function useEquipeModule({ perfil, id_pdv }: Props): UseEquipeModuleReturn {
  const { addToast } = useToast();
  const {
    searchParams,
    busca,
    idPdvFiltro,
    statusFiltro,
    cargoFiltro,
    ordenarPor,
    direcao,
    pagina,
    porPagina,
    atualizarParametrosUrl,
    limparFiltros,
  } = useEquipeFiltros();

  const [carregandoCadastro, setCarregandoCadastro] = useState(false);
  const [erroCadastro, setErroCadastro] = useState<string | null>(null);
  const [cargoSelecionado, setCargoSelecionado] = useState("COLABORADOR");
  const [pdvSelecionado, setPdvSelecionado] = useState("");
  const [dialogNovoFuncionarioAberto, setDialogNovoFuncionarioAberto] = useState(false);
  const [loginComoLoading, setLoginComoLoading] = useState<string | null>(null);

  // Callback para abrir o dialog com valores corretos para o perfil
  const abrirDialogNovoFuncionario = useCallback(
    (aberto: boolean) => {
      if (aberto) {
        // GERENTE só pode adicionar COLABORADOR no próprio PDV
        if (perfil === "GERENTE" && id_pdv) {
          setCargoSelecionado("COLABORADOR");
          setPdvSelecionado(id_pdv);
        }
      }
      setDialogNovoFuncionarioAberto(aberto);
    },
    [perfil, id_pdv],
  );
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const INATIVA_POLLING_MS = 15000;
  const [idsSelecionados, setIdsSelecionados] = useState<string[]>([]);

  const {
    pdvs,
    carregandoPdvs,
    criandoPdv,
    pdvEmEdicao,
    setPdvEmEdicao,
    salvandoPdvId,
    pdvParaExcluir,
    setPdvParaExcluir,
    excluindoPdvId,
    erroGestaoPdvs,
    instancias,
    criarPdv,
    editarPdv,
    excluirPdv,
    carregarPdvs,
  } = usePdvManagement();
  const {
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
    funcionariosAtivosParaDestino: _funcionariosAtivosParaDestino,
    todosDaPaginaSelecionados,
  } = useEquipeLista({
    searchParams,
    idsSelecionados,
    setIdsSelecionados,
  });

  const todosFuncionarios = useMemo(() => {
    const map = new Map<string, Funcionario>();
    pdvs.forEach((pdv) => {
      (pdv.funcionarios ?? []).forEach((f) => {
        if (!map.has(f.id)) {
          map.set(f.id, {
            id: f.id,
            nome: f.nome,
            email: f.email ?? "",
            cargo: f.cargo,
            ativo: f.ativo ?? true,
            pdv: { id: pdv.id, nome: pdv.nome },
          });
        }
      });
    });
    return Array.from(map.values());
  }, [pdvs]);

  const funcionariosAtivosParaDestino = useMemo(
    () => todosFuncionarios.filter((f) => f.ativo),
    [todosFuncionarios],
  );

  const {
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
  } = useEquipeLote({
    idsSelecionados,
    setIdsSelecionados,
    funcionarios,
    carregarFuncionarios,
    carregarPdvs,
    addToast,
  });

  const podeGerenciarEmpresa = perfil === "EMPRESA";
  const pdvFocoEdicaoId = searchParams.get("editar_pdv");
  const podeExecutarAcoesLote = perfil === "EMPRESA" || perfil === "GERENTE";
  const podeInativar = perfil === "EMPRESA" || perfil === "GERENTE";
  const podeAdicionarFuncionario = perfil === "EMPRESA" || perfil === "GERENTE";

  const {
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
  } = useFuncionarioEdicao({
    pdvs,
    setFuncionarios,
    addToast,
  });

  useEffect(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    pollingRef.current = setInterval(() => {
      if (!editandoId && !temAlteracoesNaoSalvas) {
        setAtualizando(true);
        carregarFuncionarios().finally(() => setAtualizando(false));
      }
    }, INATIVA_POLLING_MS);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [carregarFuncionarios, editandoId, temAlteracoesNaoSalvas, setAtualizando]);

  const {
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
  } = useFuncionarioInativacao({
    funcionarios: todosFuncionarios,
    funcionariosAtivosParaDestino,
    setFuncionarios,
    setErroLista,
    carregarFuncionarios,
    carregarPdvs,
    addToast,
  });

  const adicionarFuncionario = useCallback(
    async (evento: React.FormEvent<HTMLFormElement>): Promise<boolean> => {
      evento.preventDefault();
      setErroCadastro(null);
      setCarregandoCadastro(true);
      
      const dados = new FormData(evento.currentTarget);
      const nomeFuncionario = dados.get("nome") as string;

      try {
        const resultado = await criarFuncionario({
          nome: dados.get("nome"),
          email: dados.get("email"),
          senha: dados.get("senha"),
          cargo: dados.get("cargo"),
          id_pdv: dados.get("id_pdv"),
        });

        if (!resultado.ok) {
          setErroCadastro(resultado.erro);
          return false;
        }

        addToast({
          type: "success",
          title: "Colaborador cadastrado",
          description: `${nomeFuncionario} foi adicionado à equipe.`,
          duration: 4000,
        });

        evento.currentTarget?.reset();
        setCargoSelecionado("COLABORADOR");
        setPdvSelecionado("");
        setDialogNovoFuncionarioAberto(false);
        void Promise.all([carregarFuncionarios(), carregarPdvs()]);
        return true;
      } finally {
        setCarregandoCadastro(false);
      }
    },
    [carregarFuncionarios, carregarPdvs, addToast],
  );

  const loginComo = useCallback(
    async (id: string) => {
      setLoginComoLoading(id);
      try {
        const res = await fetch("/api/autenticacao/login-como", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_funcionario: id }),
        });
        const data = await res.json();
        if (!res.ok) {
          addToast({
            type: "error",
            title: "Erro ao logar como funcionario",
            description: data.erro ?? "Tente novamente.",
            duration: 5000,
          });
          return;
        }
        addToast({
          type: "success",
          title: "Login realizado",
          description: `Voce agora esta logado como ${data.nome}.`,
          duration: 3000,
        });
        setTimeout(() => window.location.reload(), 300);
      } catch {
        addToast({
          type: "error",
          title: "Erro de conexao",
          description: "Verifique sua internet e tente novamente.",
          duration: 5000,
        });
      } finally {
        setLoginComoLoading(null);
      }
    },
    [addToast],
  );

  return {
    funcionarios,
    todosFuncionarios,
    pdvs,
    paginacao,
    kpis,
    kpisTotais,
    carregandoLista,
    carregandoCadastro,
    atualizando,
    erroLista,
    erroCadastro,
    dialogNovoFuncionarioAberto,
    setDialogNovoFuncionarioAberto,
    abrirDialogNovoFuncionario,
    dialogInativacaoAberto,
    setDialogInativacaoAberto,
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
    idsSelecionados,
    executandoLote,
    resultadoLote,
    erroLote,
    lotePodeExecutar,
    loteResumoAcao,
    lotePendencia,
    acaoLote,
    cargoLote,
    pdvLote,
    podeGerenciarEmpresa,
    idPdvGerenciado: id_pdv,
    podeExecutarAcoesLote,
    podeInativar,
    podeAdicionarFuncionario,
    busca,
    idPdvFiltro,
    statusFiltro,
    cargoFiltro,
    ordenarPor,
    direcao,
    pagina,
    porPagina,
    funcionariosAtivosParaDestino,
    funcionariosDestinoMesmoPdv,
    carregandoPdvs,
    criandoPdv,
    pdvEmEdicao,
    setPdvEmEdicao,
    pdvParaExcluir,
    setPdvParaExcluir,
    salvandoPdvId,
    excluindoPdvId,
    erroGestaoPdvs,
    pdvFocoEdicaoId,
    criarPdv,
    editarPdv,
    excluirPdv,
    instancias,
    funcionariosDestinoInativacao: funcionarioDestinoInativacao,
    destinoInativacaoIndividual,
    setDestinoInativacaoIndividual,
    observacaoInativacaoIndividual,
    setObservacaoInativacaoIndividual,
    executandoInativacaoIndividual,
    erroInativacaoIndividual,
    destinoInativacaoLote,
    setDestinoInativacaoLote,
    observacaoLote,
    setObservacaoLote,
    cargoSelecionado,
    setCargoSelecionado,
    pdvSelecionado,
    setPdvSelecionado,
    atualizarParametrosUrl,
    iniciarEdicao,
    cancelarEdicao,
    aoMudarDado,
    salvarEdicaoAtual,
    desfazerUltimaEdicao,
    abrirModalInativacao,
    confirmarInativacaoIndividual,
    reativarFuncionarioIndividual,
    alternarSelecao,
    alternarSelecaoPagina,
    executarAcaoLote,
    adicionarFuncionario,
    setAcaoLote,
    setCargoLote,
    setPdvLote,
    setErroLista,
    todosDaPaginaSelecionados,
    carregarFuncionarios,
    contadoresFiltro,
    temAlteracoesNaoSalvas,
    limparFiltros,
    loginComo,
    loginComoLoading,
  };
}
