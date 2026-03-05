"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { criarFuncionario } from "@/lib/api/equipe";
import type { Props, UseEquipeModuleReturn } from "../types";
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
    funcionariosAtivosParaDestino,
    todosDaPaginaSelecionados,
  } = useEquipeLista({
    searchParams,
    idsSelecionados,
    setIdsSelecionados,
  });

  const {
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
  } = useEquipeLote({
    idsSelecionados,
    setIdsSelecionados,
    funcionarios,
    carregarFuncionarios,
  });

  const podeGerenciarEmpresa = perfil === "EMPRESA";
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
    abrirModalInativacao,
    confirmarInativacaoIndividual,
  } = useFuncionarioInativacao({
    funcionarios,
    funcionariosAtivosParaDestino,
    setFuncionarios,
    setErroLista,
    carregarFuncionarios,
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

  return {
    funcionarios,
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
    acaoLote,
    cargoLote,
    pdvLote,
    podeGerenciarEmpresa,
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
  };
}
