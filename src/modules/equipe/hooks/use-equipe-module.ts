"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import type {
  Funcionario,
  Pdv,
  Paginacao,
  KpisEquipe,
  Props,
  DadosEdicao,
  ErrosEdicao,
  StatusSalvamento,
  ResultadoLote,
  FuncionarioDestinoInativacao,
  AcaoLote,
  UseEquipeModuleReturn,
} from "../types";
import { CARGOS_EQUIPE, PASTEL_COLORS } from "../constants";

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

export function useEquipeModule({ perfil, id_pdv }: Props): UseEquipeModuleReturn {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { addToast } = useToast();

  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [pdvs, setPdvs] = useState<Pdv[]>([]);
  const [carregandoPdvs, setCarregandoPdvs] = useState(false);
  const [criandoPdv, setCriandoPdv] = useState(false);
  const [pdvEmEdicao, setPdvEmEdicao] = useState<{ id: string; nome: string } | null>(null);
  const [salvandoPdvId, setSalvandoPdvId] = useState<string | null>(null);
  const [pdvParaExcluir, setPdvParaExcluir] = useState<{ id: string; nome: string } | null>(null);
  const [excluindoPdvId, setExcluindoPdvId] = useState<string | null>(null);
  const [erroGestaoPdvs, setErroGestaoPdvs] = useState<string | null>(null);
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
  const [atualizando, setAtualizando] = useState(false); // Indica se está em背景Polling (refresh discreto)
  const [carregandoCadastro, setCarregandoCadastro] = useState(false);
  const [erroCadastro, setErroCadastro] = useState<string | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);
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
  const [dialogInativacaoAberto, setDialogInativacaoAberto] = useState(false);
  const [funcionarioDestinoInativacao, setFuncionarioDestinoInativacao] = useState<FuncionarioDestinoInativacao | null>(null);
  const [destinoInativacaoIndividual, setDestinoInativacaoIndividual] = useState("");
  const [observacaoInativacaoIndividual, setObservacaoInativacaoIndividual] = useState("");
  const [executandoInativacaoIndividual, setExecutandoInativacaoIndividual] = useState(false);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [dadosEdicao, setDadosEdicao] = useState<DadosEdicao | null>(null);
  const [errosEdicao, setErrosEdicao] = useState<ErrosEdicao>({});
  const [statusSalvamento, setStatusSalvamento] = useState<StatusSalvamento>({ id: null, estado: "idle" });
  const [ultimoSnapshot, setUltimoSnapshot] = useState<{ id: string; dados: DadosEdicao } | null>(null);
  const [temAlteracoesNaoSalvas, setTemAlteracoesNaoSalvas] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [idsSelecionados, setIdsSelecionados] = useState<string[]>([]);
  const [executandoLote, setExecutandoLote] = useState(false);
  const [resultadoLote, setResultadoLote] = useState<ResultadoLote | null>(null);
  const [erroLote, setErroLote] = useState<string | null>(null);
  const [acaoLote, setAcaoLote] = useState<AcaoLote>("ATIVAR");
  const [cargoLote, setCargoLote] = useState("COLABORADOR");
  const [pdvLote, setPdvLote] = useState("");
  const [destinoInativacaoLote, setDestinoInativacaoLote] = useState("");
  const [observacaoLote, setObservacaoLote] = useState("");
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const INATIVA_POLLING_MS = 15000;

  const busca = searchParams.get("busca") ?? "";
  const idPdvFiltro = searchParams.get("id_pdv") ?? "";
  const statusFiltro = searchParams.get("status") ?? "TODOS";
  const cargoFiltro = searchParams.get("cargo") ?? "TODOS";
  const ordenarPor = searchParams.get("ordenar_por") ?? "nome";
  const direcao = searchParams.get("direcao") ?? "asc";
  const pagina = Number(searchParams.get("pagina") ?? "1");
  const porPagina = Number(searchParams.get("por_pagina") ?? "20");
  const podeGerenciarEmpresa = perfil === "EMPRESA";
  const podeExecutarAcoesLote = perfil === "EMPRESA";
  const podeInativar = perfil === "EMPRESA" || perfil === "GERENTE";
  const podeAdicionarFuncionario = perfil === "EMPRESA" || perfil === "GERENTE";

  // Contadores para os filtros
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

  const atualizarParametrosUrl = useCallback(
    (atualizacoes: Record<string, string | null>, resetarPagina = false) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(atualizacoes).forEach(([chave, valor]) => {
        if (!valor) {
          params.delete(chave);
          return;
        }

        params.set(chave, valor);
      });

      if (resetarPagina) {
        params.set("pagina", "1");
      }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const limparTimerAutoSave = useCallback(() => {
    if (!timeoutRef.current) {
      return;
    }

    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  const limparFiltros = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("busca");
    params.delete("id_pdv");
    params.delete("status");
    params.delete("cargo");
    params.delete("ordenar_por");
    params.delete("direcao");
    params.set("pagina", "1");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [pathname, router, searchParams]);

  const limparTimerStatus = useCallback(() => {
    if (!statusTimeoutRef.current) {
      return;
    }

    clearTimeout(statusTimeoutRef.current);
    statusTimeoutRef.current = null;
  }, []);

  const carregarFuncionarios = useCallback(async () => {
    setCarregandoLista(true);
    setErroLista(null);

    try {
      const resposta = await fetch(`/api/funcionarios?${searchParams.toString()}`);
      if (!resposta.ok) {
        const json = await resposta.json().catch(() => null);
        setErroLista(json?.erro ?? "Erro ao carregar equipe.");
        return;
      }

      const json = (await resposta.json()) as {
        funcionarios?: Funcionario[];
        paginacao?: Paginacao;
        kpis?: KpisEquipe;
        kpis_totais?: KpisEquipe;
      };

      const lista = json.funcionarios ?? [];
      setFuncionarios(lista);
      setPaginacao(
        json.paginacao ?? {
          pagina: 1,
          por_pagina: 20,
          total: lista.length,
          total_paginas: 1,
        },
      );

      // Se a API retorna kpis_totais, usa. Se não, usa kpis como totais
      const kpisCalculados = json.kpis ?? {
        total: lista.length,
        ativos: lista.filter((funcionario) => funcionario.ativo).length,
        inativos: lista.filter((funcionario) => !funcionario.ativo).length,
        gerentes: lista.filter((funcionario) => funcionario.cargo === "GERENTE").length,
        colaboradores: lista.filter((funcionario) => funcionario.cargo === "COLABORADOR").length,
      };

      // Usa kpis_totais da API se disponível, senão usa kpis como totais
      const kpisTotaisCalculados = json.kpis_totais ?? kpisCalculados;

      setKpis(kpisCalculados);
      setKpisTotais(kpisTotaisCalculados);

      setIdsSelecionados((atual) => atual.filter((id) => lista.some((funcionario) => funcionario.id === id)));
    } finally {
      setCarregandoLista(false);
    }
  }, [searchParams]);

  const carregarPdvs = useCallback(async () => {
    setCarregandoPdvs(true);
    setErroGestaoPdvs(null);
    try {
      const resposta = await fetch("/api/pdvs", { cache: "no-store" });
      const json = (await resposta.json().catch(() => ({}))) as {
        pdvs?: Pdv[];
        erro?: string;
      };
      if (!resposta.ok) {
        setErroGestaoPdvs(json.erro ?? "Erro ao carregar PDVs.");
        return;
      }
      setPdvs(json.pdvs ?? []);
    } finally {
      setCarregandoPdvs(false);
    }
  }, []);

  useEffect(() => {
    let ativo = true;

    const carregarRecursos = async () => {
      if (!ativo) return;
      await carregarPdvs();
    };

    void carregarRecursos();

    return () => {
      ativo = false;
    };
  }, [carregarPdvs]);

  useEffect(() => {
    void carregarFuncionarios();
  }, [carregarFuncionarios]);

  useEffect(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    pollingRef.current = setInterval(() => {
      // Não recarrega se houver edição em andamento ou alterações não salvas
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
  }, [carregarFuncionarios, INATIVA_POLLING_MS, editandoId, temAlteracoesNaoSalvas]);

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

      setFuncionarios((atual) =>
        atual.map((item) => {
          if (item.id !== id) {
            return item;
          }

          funcionarioAnterior = item;
          return atualizarFuncionarioNaLista(item, dados, pdvs);
        }),
      );

      if (!funcionarioAnterior) {
        setStatusSalvamento({ id, estado: "error", mensagem: "Funcionario nao encontrado." });
        return false;
      }

      try {
        const resposta = await fetch(`/api/funcionarios/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dados),
        });

        if (!resposta.ok) {
          const json = await resposta.json().catch(() => null);
          setFuncionarios((atual) => atual.map((item) => (item.id === id ? funcionarioAnterior ?? item : item)));
          setStatusSalvamento({
            id,
            estado: "error",
            mensagem: json?.erro ?? "Erro ao salvar alteracoes.",
          });
          return false;
        }

        setUltimoSnapshot({ id, dados: extrairDadosEdicao(funcionarioAnterior) });
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
        setFuncionarios((atual) => atual.map((item) => (item.id === id ? funcionarioAnterior ?? item : item)));
        setStatusSalvamento({ id, estado: "error", mensagem: "Erro ao salvar alteracoes." });
        return false;
      }
    },
    [limparTimerStatus, pdvs, addToast],
  );

  const iniciarEdicao = useCallback(
    (funcionario: Funcionario) => {
      limparTimerAutoSave();
      setEditandoId(funcionario.id);
      setDadosEdicao(extrairDadosEdicao(funcionario));
      setErrosEdicao({});
      setStatusSalvamento({ id: funcionario.id, estado: "idle" });
      setTemAlteracoesNaoSalvas(true);
    },
    [limparTimerAutoSave],
  );

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
        // Feedback visual - toast de salvamento em andamento
        addToast({
          type: "info",
          title: "Salvando alterações...",
          duration: 800,
        });
        void salvarFuncionario(editandoId, novosDados);
      }, 700);
    },
    [dadosEdicao, editandoId, limparTimerAutoSave, salvarFuncionario, addToast],
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

  const salvarEdicaoAtual = useCallback(async () => {
    if (!editandoId || !dadosEdicao) {
      return;
    }

    const ok = await salvarFuncionario(editandoId, dadosEdicao);
    if (ok) {
      cancelarEdicao();
    }
  }, [cancelarEdicao, dadosEdicao, editandoId, salvarFuncionario]);

  const funcionariosAtivosParaDestino = useMemo(
    () => funcionarios.filter((funcionario) => funcionario.ativo),
    [funcionarios],
  );

  const funcionariosDestinoMesmoPdv = useMemo(() => {
    if (!funcionarioDestinoInativacao) return [];
    const origem = funcionarios.find((funcionario) => funcionario.id === funcionarioDestinoInativacao.id);
    if (!origem?.pdv?.id) return [];

    return funcionarios.filter(
      (funcionario) =>
        funcionario.ativo &&
        funcionario.id !== funcionarioDestinoInativacao.id &&
        funcionario.pdv?.id === origem.pdv.id,
    );
  }, [funcionarios, funcionarioDestinoInativacao]);

  const criarPdv = useCallback(async (nome: string) => {
    const nomeNormalizado = nome.trim();
    if (!nomeNormalizado) {
      setErroGestaoPdvs("Nome do PDV e obrigatorio.");
      return;
    }

    setErroGestaoPdvs(null);
    setCriandoPdv(true);

    try {
      const resposta = await fetch("/api/pdvs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nomeNormalizado }),
      });

      const json = (await resposta.json().catch(() => ({}))) as { erro?: string };
      if (!resposta.ok) {
        setErroGestaoPdvs(json.erro ?? "Erro ao criar PDV.");
        return;
      }

      await carregarPdvs();
    } catch {
      setErroGestaoPdvs("Erro ao criar PDV.");
    } finally {
      setCriandoPdv(false);
    }
  }, [carregarPdvs]);

  const editarPdv = useCallback(async (id: string, nome: string) => {
    const nomeNormalizado = nome.trim();
    if (!nomeNormalizado) {
      setErroGestaoPdvs("Nome do PDV e obrigatorio.");
      return false;
    }

    const pdvAnterior = pdvs.find((item) => item.id === id);
    if (!pdvAnterior) {
      return false;
    }

    setErroGestaoPdvs(null);
    setSalvandoPdvId(id);
    setPdvs((atual) =>
      atual.map((item) => (item.id === id ? { ...item, nome: nomeNormalizado } : item)),
    );

    try {
      const resposta = await fetch(`/api/pdvs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nomeNormalizado }),
      });

      if (!resposta.ok) {
        const json = (await resposta.json().catch(() => ({}))) as { erro?: string };
        setErroGestaoPdvs(json.erro ?? "Erro ao editar PDV.");
        setPdvs((atual) => atual.map((item) => (item.id === id ? pdvAnterior : item)));
        return false;
      }
      return true;
    } catch {
      setErroGestaoPdvs("Erro ao editar PDV.");
      setPdvs((atual) => atual.map((item) => (item.id === id ? pdvAnterior : item)));
      return false;
    } finally {
      setSalvandoPdvId(null);
    }
  }, [pdvs]);

  const excluirPdv = useCallback(async (id: string) => {
    const pdvAnterior = pdvs.find((item) => item.id === id);

    setErroGestaoPdvs(null);
    setExcluindoPdvId(id);
    setPdvs((atual) => atual.filter((item) => item.id !== id));

    try {
      const resposta = await fetch(`/api/pdvs/${id}`, {
        method: "DELETE",
      });

      if (!resposta.ok) {
        const json = (await resposta.json().catch(() => ({}))) as { erro?: string };
        setErroGestaoPdvs(json.erro ?? "Erro ao excluir PDV.");
        if (pdvAnterior) {
          setPdvs((atual) => [...atual, pdvAnterior]);
        }
      }
    } catch {
      setErroGestaoPdvs("Erro ao excluir PDV.");
      if (pdvAnterior) {
        setPdvs((atual) => [...atual, pdvAnterior]);
      }
    } finally {
      setExcluindoPdvId(null);
    }
  }, [pdvs]);

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

      const resposta = await fetch(`/api/funcionarios/${id}/inativar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_funcionario_destino: destino,
          observacao: obs || undefined,
        }),
      });

      if (!resposta.ok) {
        const json = await resposta.json().catch(() => null);
        setErroLista(json?.erro ?? "Erro ao deletar funcionario.");
        setFuncionarios((atual) => [...atual, funcionarioAnterior]);
        return false;
      }

      void carregarFuncionarios();
      return true;
    },
    [funcionarios, carregarFuncionarios],
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
    [funcionariosAtivosParaDestino],
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

  const alternarSelecao = useCallback((id: string, marcado: boolean) => {
    setIdsSelecionados((atual) => {
      if (marcado) {
        return Array.from(new Set([...atual, id]));
      }

      return atual.filter((item) => item !== id);
    });
  }, []);

  const alternarSelecaoPagina = useCallback(
    (marcado: boolean) => {
      if (marcado) {
        setIdsSelecionados((atual) => Array.from(new Set([...atual, ...funcionarios.map((item) => item.id)])));
        return;
      }

      setIdsSelecionados((atual) => atual.filter((id) => !funcionarios.some((item) => item.id === id)));
    },
    [funcionarios],
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

    const resposta = await fetch("/api/funcionarios", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!resposta.ok) {
      const json = await resposta.json().catch(() => null);
      setErroLote(json?.erro ?? "Erro ao executar acao em lote.");
      setExecutandoLote(false);
      return;
    }

    const json = (await resposta.json()) as ResultadoLote;
    setResultadoLote(json);
    setExecutandoLote(false);
    setIdsSelecionados([]);
    void carregarFuncionarios();
  }, [idsSelecionados, acaoLote, cargoLote, pdvLote, destinoInativacaoLote, observacaoLote, carregarFuncionarios]);

  const adicionarFuncionario = useCallback(
    async (evento: React.FormEvent<HTMLFormElement>) => {
      evento.preventDefault();
      setErroCadastro(null);
      setCarregandoCadastro(true);
      
      const dados = new FormData(evento.currentTarget);
      const nomeFuncionario = dados.get("nome") as string;

      try {
        const resposta = await fetch("/api/funcionarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: dados.get("nome"),
            email: dados.get("email"),
            senha: dados.get("senha"),
            cargo: dados.get("cargo"),
            id_pdv: dados.get("id_pdv"),
          }),
        });

        if (!resposta.ok) {
          const json = await resposta.json().catch(() => null);
          setErroCadastro(json?.erro ?? "Erro ao cadastrar funcionario");
          return;
        }

        // Feedback de sucesso
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
        void carregarFuncionarios();
      } finally {
        setCarregandoCadastro(false);
      }
    },
    [carregarFuncionarios, addToast],
  );

  useEffect(() => {
    return () => {
      limparTimerAutoSave();
      limparTimerStatus();
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [limparTimerAutoSave, limparTimerStatus]);

  // Warning ao sair com alterações pendentes
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

  const todosDaPaginaSelecionados = useMemo(
    () => funcionarios.length > 0 && funcionarios.every((item) => idsSelecionados.includes(item.id)),
    [funcionarios, idsSelecionados],
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
    dadosEdicao,
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
