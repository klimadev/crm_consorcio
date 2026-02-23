"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil, Search, Shield, ShieldUser, UserCheck, UserPlus, UserX, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Pdv = { id: string; nome: string };

type Funcionario = {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  ativo: boolean;
  pdv: { id: string; nome: string };
};

type Paginacao = {
  pagina: number;
  por_pagina: number;
  total: number;
  total_paginas: number;
};

type KpisEquipe = {
  total: number;
  ativos: number;
  inativos: number;
  gerentes: number;
  colaboradores: number;
};

type Props = {
  perfil: "EMPRESA" | "GERENTE" | "COLABORADOR";
};

type DadosEdicao = {
  nome: string;
  email: string;
  cargo: string;
  id_pdv: string;
};

type ErrosEdicao = Partial<Record<keyof DadosEdicao, string>>;

type StatusSalvamento = {
  id: string | null;
  estado: "idle" | "saving" | "saved" | "error";
  mensagem?: string;
};

type ResultadoLote = {
  processados: number;
  atualizados: number;
  falhas: Array<{ id: string; motivo: string }>;
};

type FuncionarioDestinoInativacao = {
  id: string;
  nome: string;
};

type AcaoLote = "ATIVAR" | "INATIVAR" | "ALTERAR_CARGO" | "ALTERAR_PDV";

const CARGOS_EQUIPE = ["COLABORADOR", "GERENTE"] as const;

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

function obterIniciais(nome: string) {
  const partes = nome
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (partes.length === 0) {
    return "?";
  }

  return partes.map((parte) => parte[0]?.toUpperCase() ?? "").join("");
}

const GRADIENTES_AVATAR = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-orange-500 to-amber-500",
  "from-rose-500 to-pink-500",
  "from-indigo-500 to-blue-500",
  "from-cyan-500 to-blue-500",
  "from-lime-500 to-green-500",
];

function obterCorAvatar(nome: string): string {
  const indice = nome.charCodeAt(0) % GRADIENTES_AVATAR.length;
  return GRADIENTES_AVATAR[indice];
}

export function ModuloEquipe({ perfil }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [pdvs, setPdvs] = useState<Pdv[]>([]);
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
  const [carregandoLista, setCarregandoLista] = useState(false);
  const [erroCadastro, setErroCadastro] = useState<string | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);
  const [cargoSelecionado, setCargoSelecionado] = useState("COLABORADOR");
  const [pdvSelecionado, setPdvSelecionado] = useState("");
  const [dialogNovoFuncionarioAberto, setDialogNovoFuncionarioAberto] = useState(false);
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

  const busca = searchParams.get("busca") ?? "";
  const statusFiltro = searchParams.get("status") ?? "TODOS";
  const cargoFiltro = searchParams.get("cargo") ?? "TODOS";
  const ordenarPor = searchParams.get("ordenar_por") ?? "nome";
  const direcao = searchParams.get("direcao") ?? "asc";
  const pagina = Number(searchParams.get("pagina") ?? "1");
  const porPagina = Number(searchParams.get("por_pagina") ?? "20");
  const podeGerenciarEmpresa = perfil === "EMPRESA";
  const podeExecutarAcoesLote = perfil === "EMPRESA";
  const podeInativar = perfil === "EMPRESA" || perfil === "GERENTE";

  const atualizarParametrosUrl = useCallback((atualizacoes: Record<string, string | null>, resetarPagina = false) => {
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
  }, [pathname, router, searchParams]);

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
      setKpis(
        json.kpis ?? {
          total: lista.length,
          ativos: lista.filter((funcionario) => funcionario.ativo).length,
          inativos: lista.filter((funcionario) => !funcionario.ativo).length,
          gerentes: lista.filter((funcionario) => funcionario.cargo === "GERENTE").length,
          colaboradores: lista.filter((funcionario) => funcionario.cargo === "COLABORADOR").length,
        },
      );
      setIdsSelecionados((atual) => atual.filter((id) => lista.some((funcionario) => funcionario.id === id)));
    } finally {
      setCarregandoLista(false);
    }
  }, [searchParams]);

  useEffect(() => {
    let ativo = true;

    const carregarPdvs = async () => {
      const resposta = await fetch("/api/pdvs");
      if (!ativo || !resposta.ok) {
        return;
      }

      const json = await resposta.json();
      setPdvs(json.pdvs ?? []);
    };

    void carregarPdvs();

    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    void carregarFuncionarios();
  }, [carregarFuncionarios]);

  const salvarFuncionario = useCallback(async (id: string, dados: DadosEdicao) => {
    const erros = validarDadosEdicao(dados);
    if (Object.keys(erros).length > 0) {
      setErrosEdicao(erros);
      setStatusSalvamento({
        id,
        estado: "error",
        mensagem: "Corrija os campos destacados.",
      });
      return;
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
      return;
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
        return;
      }

      setUltimoSnapshot({ id, dados: extrairDadosEdicao(funcionarioAnterior) });
      setStatusSalvamento({ id, estado: "saved", mensagem: "Alteracoes salvas." });

      limparTimerStatus();
      statusTimeoutRef.current = setTimeout(() => {
        setStatusSalvamento((atual) => (atual.id === id ? { id, estado: "idle" } : atual));
      }, 2000);
    } catch {
      setFuncionarios((atual) => atual.map((item) => (item.id === id ? funcionarioAnterior ?? item : item)));
      setStatusSalvamento({ id, estado: "error", mensagem: "Erro ao salvar alteracoes." });
    }
  }, [limparTimerStatus, pdvs]);

  function iniciarEdicao(funcionario: Funcionario) {
    limparTimerAutoSave();
    setEditandoId(funcionario.id);
    setDadosEdicao(extrairDadosEdicao(funcionario));
    setErrosEdicao({});
    setStatusSalvamento({ id: funcionario.id, estado: "idle" });
  }

  function cancelarEdicao() {
    limparTimerAutoSave();
    setEditandoId(null);
    setDadosEdicao(null);
    setErrosEdicao({});
    setStatusSalvamento({ id: null, estado: "idle" });
  }

  function aoMudarDado(campo: keyof DadosEdicao, valor: string) {
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
      void salvarFuncionario(editandoId, novosDados);
    }, 700);
  }

  async function desfazerUltimaEdicao() {
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
  }

  const funcionariosAtivosParaDestino = useMemo(
    () => funcionarios.filter((funcionario) => funcionario.ativo),
    [funcionarios],
  );

  async function inativarFuncionario(id: string, destino: string, observacao?: string) {
    if (!destino) {
      setErroLista("Selecione um colaborador de destino para reatribuicao.");
      return false;
    }

    if (destino === id) {
      setErroLista("O destino da reatribuicao precisa ser diferente do colaborador inativado.");
      return false;
    }

    const funcionarioAnterior = funcionarios.find((item) => item.id === id);
    if (!funcionarioAnterior) {
      return false;
    }

    setErroLista(null);
    setFuncionarios((atual) => atual.map((item) => (item.id === id ? { ...item, ativo: false } : item)));

    const resposta = await fetch(`/api/funcionarios/${id}/inativar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_funcionario_destino: destino,
        observacao: observacao || undefined,
      }),
    });

    if (!resposta.ok) {
      const json = await resposta.json().catch(() => null);
      setErroLista(json?.erro ?? "Erro ao inativar funcionario.");
      setFuncionarios((atual) => atual.map((item) => (item.id === id ? funcionarioAnterior : item)));
      return false;
    }

    void carregarFuncionarios();
    return true;
  }

  function abrirModalInativacao(funcionario: Funcionario) {
    setFuncionarioDestinoInativacao({ id: funcionario.id, nome: funcionario.nome });
    setDestinoInativacaoIndividual("");
    setObservacaoInativacaoIndividual("");
    setErroLista(null);
    setDialogInativacaoAberto(true);
  }

  async function confirmarInativacaoIndividual() {
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
  }

  function alternarSelecao(id: string, marcado: boolean) {
    setIdsSelecionados((atual) => {
      if (marcado) {
        return Array.from(new Set([...atual, id]));
      }

      return atual.filter((item) => item !== id);
    });
  }

  function alternarSelecaoPagina(marcado: boolean) {
    if (marcado) {
      setIdsSelecionados((atual) => Array.from(new Set([...atual, ...funcionarios.map((item) => item.id)])));
      return;
    }

    setIdsSelecionados((atual) => atual.filter((id) => !funcionarios.some((item) => item.id === id)));
  }

  async function executarAcaoLote() {
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
  }

  async function adicionarFuncionario(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErroCadastro(null);
    const dados = new FormData(evento.currentTarget);

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

    evento.currentTarget.reset();
    setCargoSelecionado("COLABORADOR");
    setPdvSelecionado("");
    setDialogNovoFuncionarioAberto(false);
    void carregarFuncionarios();
  }

  useEffect(() => {
    return () => {
      limparTimerAutoSave();
      limparTimerStatus();
    };
  }, [limparTimerAutoSave, limparTimerStatus]);

  if (perfil === "COLABORADOR") {
    return (
      <section className="rounded-2xl border border-amber-200/50 bg-amber-50/50 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">Acesso restrito</p>
        <h2 className="mt-2 text-2xl font-semibold text-[#1A1D1F]">Sem permissao para acessar equipe</h2>
        <p className="mt-2 max-w-2xl text-sm text-[#6F767E]">
          Este modulo e visivel apenas para perfis de gestao. Solicite ao administrador da empresa a elevacao de permissao.
        </p>
      </section>
    );
  }

  const todosDaPaginaSelecionados = funcionarios.length > 0 && funcionarios.every((item) => idsSelecionados.includes(item.id));
  const itensKpi = [
    { titulo: "Total", valor: kpis.total, icone: Users, corIcone: "text-slate-600", corFundo: "bg-slate-100" },
    { titulo: "Ativos", valor: kpis.ativos, icone: UserCheck, corIcone: "text-emerald-600", corFundo: "bg-emerald-50" },
    { titulo: "Inativos", valor: kpis.inativos, icone: UserX, corIcone: "text-rose-600", corFundo: "bg-rose-50" },
    { titulo: "Gerentes", valor: kpis.gerentes, icone: ShieldUser, corIcone: "text-violet-600", corFundo: "bg-violet-50" },
    { titulo: "Colaboradores", valor: kpis.colaboradores, icone: Shield, corIcone: "text-blue-600", corFundo: "bg-blue-50" },
  ] as const;
  const coberturaAtiva = `${kpis.ativos} ${kpis.ativos === 1 ? "ativo" : "ativos"}`;
  const campoOrdenacao = ordenarPor as "nome" | "email" | "cargo" | "criado_em";

  function alternarOrdenacao(campo: "nome" | "email" | "cargo") {
    const proximaDirecao = campoOrdenacao === campo && direcao === "asc" ? "desc" : "asc";
    atualizarParametrosUrl({ ordenar_por: campo, direcao: proximaDirecao }, true);
  }

  function iconeOrdenacao(campo: "nome" | "email" | "cargo") {
    if (campoOrdenacao !== campo) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />;
    }

    return direcao === "asc" ? <ArrowUp className="h-3.5 w-3.5 text-[#1A1D1F]" /> : <ArrowDown className="h-3.5 w-3.5 text-[#1A1D1F]" />;
  }

  return (
    <section className="space-y-4 rounded-2xl bg-[#F4F4F4] p-3 pb-4 md:p-5">
      <header className="flex flex-col gap-3 rounded-xl border border-slate-200/50 bg-white px-5 py-4 shadow-[0px_4px_20px_rgba(0,0,0,0.05)] md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-[#1A1D1F] md:text-2xl">Equipe e Operacao</h1>
          <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-[#6F767E]">{coberturaAtiva}</span>
        </div>

        {podeGerenciarEmpresa ? (
          <Button className="w-full rounded-xl md:w-auto" onClick={() => setDialogNovoFuncionarioAberto(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Adicionar colaborador
          </Button>
        ) : null}
      </header>

      {erroLista ? <p className="rounded-xl border border-rose-200/50 bg-rose-50/50 px-4 py-3 text-sm font-medium text-rose-700 shadow-sm">{erroLista}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {itensKpi.map((item) => (
          <article key={item.titulo} className="relative overflow-hidden rounded-2xl border border-slate-200/50 bg-white px-4 py-4 shadow-[0px_4px_20px_rgba(0,0,0,0.05)] transition-all duration-200 hover:shadow-[0px_6px_24px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-[#6F767E]">{item.titulo}</p>
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", item.corFundo)}>
                <item.icone className={cn("h-5 w-5", item.icone)} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-semibold text-[#1A1D1F]">{item.valor}</p>
          </article>
        ))}
      </div>

      <section className="rounded-xl border border-slate-200/50 bg-white px-4 py-4 shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="h-11 rounded-full border-slate-200 bg-slate-50 pl-10 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              placeholder="Buscar por nome, email ou PDV..."
              value={busca}
              onChange={(e) => atualizarParametrosUrl({ busca: e.target.value || null }, true)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFiltro} onValueChange={(valor) => atualizarParametrosUrl({ status: valor }, true)}>
              <SelectTrigger className="h-10 w-auto min-w-[140px] rounded-full border-slate-200 bg-slate-50 px-4 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="ATIVO">Ativos</SelectItem>
                <SelectItem value="INATIVO">Inativos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={cargoFiltro} onValueChange={(valor) => atualizarParametrosUrl({ cargo: valor }, true)}>
              <SelectTrigger className="h-10 w-auto min-w-[140px] rounded-full border-slate-200 bg-slate-50 px-4 text-sm">
                <SelectValue placeholder="Cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="COLABORADOR">Colaborador</SelectItem>
                <SelectItem value="GERENTE">Gerente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {podeExecutarAcoesLote && idsSelecionados.length > 0 ? (
        <section className="space-y-3 rounded-xl border border-blue-200/30 bg-blue-50/30 px-4 py-4 shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-medium text-[#1A1D1F]">
              <span className="font-semibold text-blue-600">{idsSelecionados.length}</span> colaboradores selecionados
            </p>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select value={acaoLote} onValueChange={(valor) => setAcaoLote(valor as AcaoLote)}>
                <SelectTrigger className="h-10 w-full sm:w-[200px] rounded-xl border-slate-300 bg-white text-sm">
                  <SelectValue placeholder="Acao" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ATIVAR">Ativar</SelectItem>
                  <SelectItem value="INATIVAR">Inativar</SelectItem>
                  <SelectItem value="ALTERAR_CARGO">Mudar cargo</SelectItem>
                  <SelectItem value="ALTERAR_PDV">Mudar PDV</SelectItem>
                </SelectContent>
              </Select>

              <Button size="sm" className="rounded-xl" onClick={() => void executarAcaoLote()} disabled={executandoLote || idsSelecionados.length === 0}>
                {executandoLote ? "Processando..." : "Aplicar"}
              </Button>
            </div>
          </div>

          {acaoLote === "ALTERAR_CARGO" ? (
            <Select value={cargoLote} onValueChange={setCargoLote}>
              <SelectTrigger className="h-10 max-w-sm rounded-xl border-slate-300 bg-white text-sm">
                <SelectValue placeholder="Novo cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COLABORADOR">COLABORADOR</SelectItem>
                <SelectItem value="GERENTE">GERENTE</SelectItem>
              </SelectContent>
            </Select>
          ) : null}

          {acaoLote === "ALTERAR_PDV" ? (
            <Select value={pdvLote} onValueChange={setPdvLote}>
              <SelectTrigger className="h-10 max-w-sm rounded-xl border-slate-300 bg-white text-sm">
                <SelectValue placeholder="Novo PDV" />
              </SelectTrigger>
              <SelectContent>
                {pdvs.map((pdv) => (
                  <SelectItem key={pdv.id} value={pdv.id}>
                    {pdv.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          {acaoLote === "INATIVAR" ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Select value={destinoInativacaoLote} onValueChange={setDestinoInativacaoLote}>
                <SelectTrigger className="h-10 rounded-xl border-slate-300 bg-white text-sm">
                  <SelectValue placeholder="Destino para reatribuicao" />
                </SelectTrigger>
                <SelectContent>
                  {funcionariosAtivosParaDestino.map((funcionario) => (
                    <SelectItem key={funcionario.id} value={funcionario.id}>
                      {funcionario.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                className="h-10 rounded-xl border-slate-300 bg-white"
                placeholder="Observacao (opcional)"
                value={observacaoLote}
                onChange={(e) => setObservacaoLote(e.target.value)}
              />
            </div>
          ) : null}

          {erroLote ? <p className="text-sm font-medium text-rose-700">{erroLote}</p> : null}
          {resultadoLote ? <p className="text-sm text-[#6F767E]">Atualizados: {resultadoLote.atualizados} de {resultadoLote.processados}.</p> : null}
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-slate-200/50 bg-white px-4 py-3 shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
          <p className="text-sm text-[#6F767E]">{carregandoLista ? "Atualizando registros..." : `${paginacao.total} registros no resultado atual.`}</p>
        </div>

        <div className="space-y-2 md:hidden">
          {funcionarios.map((funcionario) => {
            const estaEditando = editandoId === funcionario.id && !!dadosEdicao;
            const statusLinha = statusSalvamento.id === funcionario.id ? statusSalvamento : null;
            const podeDesfazer = ultimoSnapshot?.id === funcionario.id;
            const gradienteAvatar = obterCorAvatar(funcionario.nome);

            return (
              <article key={funcionario.id} className="space-y-3 rounded-2xl border border-slate-200/50 bg-white p-4 shadow-[0px_4px_20px_rgba(0,0,0,0.05)] transition-all duration-200 hover:shadow-[0px_6px_24px_rgba(0,0,0,0.08)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={cn("flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br text-sm font-semibold text-white shadow-md", gradienteAvatar)}>
                      {obterIniciais(funcionario.nome)}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#1A1D1F]">{funcionario.nome}</p>
                      <p className="text-xs text-[#6F767E]">{funcionario.email}</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={idsSelecionados.includes(funcionario.id)}
                    onChange={(e) => alternarSelecao(funcionario.id, e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    aria-label={`Selecionar ${funcionario.nome}`}
                  />
                </div>

                {estaEditando && dadosEdicao ? (
                  <div className="space-y-2">
                    <Input value={dadosEdicao.nome} onChange={(e) => aoMudarDado("nome", e.target.value)} className="rounded-xl border-slate-200" />
                    {errosEdicao.nome ? <p className="text-xs font-medium text-rose-700">{errosEdicao.nome}</p> : null}

                    <Input value={dadosEdicao.email} onChange={(e) => aoMudarDado("email", e.target.value)} className="rounded-xl border-slate-200" />
                    {errosEdicao.email ? <p className="text-xs font-medium text-rose-700">{errosEdicao.email}</p> : null}

                    <Select value={dadosEdicao.cargo} onValueChange={(valor) => aoMudarDado("cargo", valor)}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Cargo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COLABORADOR">COLABORADOR</SelectItem>
                        <SelectItem value="GERENTE">GERENTE</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={dadosEdicao.id_pdv} onValueChange={(valor) => aoMudarDado("id_pdv", valor)}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="PDV" />
                      </SelectTrigger>
                      <SelectContent>
                        {pdvs.map((pdv) => (
                          <SelectItem key={pdv.id} value={pdv.id}>
                            {pdv.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-medium text-[#6F767E]">{funcionario.cargo}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[#6F767E]">{funcionario.pdv?.nome}</span>
                    <span
                      className={cn(
                        "ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors",
                        funcionario.ativo 
                          ? "bg-emerald-50/80 text-emerald-700" 
                          : "bg-rose-50/80 text-rose-700",
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", funcionario.ativo ? "bg-emerald-500" : "bg-rose-500")} />
                      {funcionario.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                )}

                {statusLinha?.estado === "saving" ? <p className="text-xs font-medium text-amber-600">{statusLinha.mensagem}</p> : null}
                {statusLinha?.estado === "saved" ? <p className="text-xs font-medium text-emerald-600">{statusLinha.mensagem}</p> : null}
                {statusLinha?.estado === "error" ? <p className="text-xs font-medium text-rose-600">{statusLinha.mensagem}</p> : null}

                <div className="flex flex-wrap gap-2">
                  {estaEditando ? (
                    <>
                      <Button size="sm" variant="outline" className="rounded-xl" onClick={cancelarEdicao}>Fechar</Button>
                      <Button size="sm" variant="outline" className="rounded-xl" disabled={!podeDesfazer || statusLinha?.estado === "saving"} onClick={() => void desfazerUltimaEdicao()}>
                        Desfazer
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="ghost" className="rounded-xl text-[#6F767E] hover:text-[#1A1D1F]" onClick={() => iniciarEdicao(funcionario)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Editar
                    </Button>
                  )}

                  {funcionario.ativo && podeInativar ? (
                    <Button size="sm" variant="ghost" className="rounded-xl text-[#6F767E] hover:text-rose-600" onClick={() => abrirModalInativacao(funcionario)}>
                      <UserX className="mr-1 h-3.5 w-3.5" />
                      Inativar
                    </Button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>

        <div className="hidden overflow-hidden rounded-2xl border border-slate-200/50 bg-white shadow-[0px_4px_20px_rgba(0,0,0,0.05)] md:block">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200/50 bg-slate-50/50 hover:bg-slate-50/50">
                <TableHead className="w-12 text-[#6F767E]">
                  <input
                    type="checkbox"
                    checked={todosDaPaginaSelecionados}
                    onChange={(e) => alternarSelecaoPagina(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    aria-label="Selecionar todos da pagina"
                  />
                </TableHead>
                <TableHead className="text-[#6F767E]">
                  <button type="button" className="inline-flex items-center gap-1 font-medium" onClick={() => alternarOrdenacao("nome")}>
                    Nome
                    {iconeOrdenacao("nome")}
                  </button>
                </TableHead>
                <TableHead className="text-[#6F767E]">
                  <button type="button" className="inline-flex items-center gap-1 font-medium" onClick={() => alternarOrdenacao("email")}>
                    E-mail
                    {iconeOrdenacao("email")}
                  </button>
                </TableHead>
                <TableHead className="text-[#6F767E]">
                  <button type="button" className="inline-flex items-center gap-1 font-medium" onClick={() => alternarOrdenacao("cargo")}>
                    Cargo
                    {iconeOrdenacao("cargo")}
                  </button>
                </TableHead>
                <TableHead className="text-[#6F767E]">PDV</TableHead>
                <TableHead className="text-[#6F767E]">Status</TableHead>
                <TableHead className="text-[#6F767E]">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {funcionarios.map((funcionario) => {
                const estaEditando = editandoId === funcionario.id && !!dadosEdicao;
                const statusLinha = statusSalvamento.id === funcionario.id ? statusSalvamento : null;
                const podeDesfazer = ultimoSnapshot?.id === funcionario.id;
                const gradienteAvatar = obterCorAvatar(funcionario.nome);

                return (
                  <TableRow key={funcionario.id} className="border-slate-200/30 transition-all duration-200 hover:bg-slate-50/80">
                    <TableCell className="py-4">
                      <input
                        type="checkbox"
                        checked={idsSelecionados.includes(funcionario.id)}
                        onChange={(e) => alternarSelecao(funcionario.id, e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        aria-label={`Selecionar ${funcionario.nome}`}
                      />
                    </TableCell>

                    <TableCell className="py-4">
                      {estaEditando && dadosEdicao ? (
                        <div className="space-y-1">
                          <Input value={dadosEdicao.nome} onChange={(e) => aoMudarDado("nome", e.target.value)} className="h-9 rounded-xl border-slate-200" />
                          {errosEdicao.nome ? <p className="text-xs font-medium text-rose-700">{errosEdicao.nome}</p> : null}
                        </div>
                      ) : (
                        <button type="button" className="group flex items-center gap-3 text-left" onClick={() => iniciarEdicao(funcionario)}>
                          <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-semibold text-white shadow-sm", gradienteAvatar)}>
                            {obterIniciais(funcionario.nome)}
                          </span>
                          <span className="font-semibold text-[#1A1D1F]">{funcionario.nome}</span>
                          <Pencil className="h-3.5 w-3.5 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
                        </button>
                      )}
                    </TableCell>

                    <TableCell className="py-4">
                      {estaEditando && dadosEdicao ? (
                        <div className="space-y-1">
                          <Input value={dadosEdicao.email} onChange={(e) => aoMudarDado("email", e.target.value)} className="h-9 rounded-xl border-slate-200" />
                          {errosEdicao.email ? <p className="text-xs font-medium text-rose-700">{errosEdicao.email}</p> : null}
                        </div>
                      ) : (
                        <button type="button" className="group inline-flex items-center gap-1 text-left text-[#6F767E] hover:text-[#1A1D1F]" onClick={() => iniciarEdicao(funcionario)}>
                          {funcionario.email}
                          <Pencil className="h-3.5 w-3.5 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
                        </button>
                      )}
                    </TableCell>

                    <TableCell className="py-4">
                      {estaEditando && dadosEdicao ? (
                        <div className="space-y-1">
                          <Select value={dadosEdicao.cargo} onValueChange={(valor) => aoMudarDado("cargo", valor)}>
                            <SelectTrigger className="h-9 w-full text-sm sm:w-40 rounded-xl">
                              <SelectValue placeholder="Cargo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="COLABORADOR">COLABORADOR</SelectItem>
                              <SelectItem value="GERENTE">GERENTE</SelectItem>
                            </SelectContent>
                          </Select>
                          {errosEdicao.cargo ? <p className="text-xs font-medium text-rose-700">{errosEdicao.cargo}</p> : null}
                        </div>
                      ) : (
                        <button type="button" className="group inline-flex items-center gap-1 text-left font-medium text-[#1A1D1F] hover:text-slate-700" onClick={() => iniciarEdicao(funcionario)}>
                          {funcionario.cargo}
                          <Pencil className="h-3.5 w-3.5 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
                        </button>
                      )}
                    </TableCell>

                    <TableCell className="py-4">
                      {estaEditando && dadosEdicao ? (
                        <div className="space-y-1">
                          <Select value={dadosEdicao.id_pdv} onValueChange={(valor) => aoMudarDado("id_pdv", valor)}>
                            <SelectTrigger className="h-9 w-full text-sm sm:w-44 rounded-xl">
                              <SelectValue placeholder="PDV" />
                            </SelectTrigger>
                            <SelectContent>
                              {pdvs.map((pdv) => (
                                <SelectItem key={pdv.id} value={pdv.id}>
                                  {pdv.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errosEdicao.id_pdv ? <p className="text-xs font-medium text-rose-700">{errosEdicao.id_pdv}</p> : null}
                        </div>
                      ) : (
                        <p className="text-[#6F767E]">{funcionario.pdv?.nome}</p>
                      )}
                    </TableCell>

                    <TableCell className="py-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                          funcionario.ativo 
                            ? "bg-emerald-50/80 text-emerald-700" 
                            : "bg-rose-50/80 text-rose-700",
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", funcionario.ativo ? "bg-emerald-500" : "bg-rose-500")} />
                        {funcionario.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </TableCell>

                    <TableCell className="py-4">
                      <div className="space-y-2">
                        {statusLinha?.estado === "saving" ? <p className="text-xs font-medium text-amber-600">{statusLinha.mensagem}</p> : null}
                        {statusLinha?.estado === "saved" ? <p className="text-xs font-medium text-emerald-600">{statusLinha.mensagem}</p> : null}
                        {statusLinha?.estado === "error" ? <p className="text-xs font-medium text-rose-600">{statusLinha.mensagem}</p> : null}

                        <div className="flex flex-wrap gap-1">
                          {estaEditando ? (
                            <>
                              <Button size="sm" variant="outline" className="rounded-xl" onClick={cancelarEdicao}>Fechar</Button>
                              <Button size="sm" variant="outline" className="rounded-xl" disabled={!podeDesfazer || statusLinha?.estado === "saving"} onClick={() => void desfazerUltimaEdicao()}>
                                Desfazer
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" variant="ghost" className="rounded-xl text-[#6F767E] hover:text-[#1A1D1F]" onClick={() => iniciarEdicao(funcionario)}>
                              <Pencil className="mr-1 h-3.5 w-3.5" />
                              Editar
                            </Button>
                          )}

                          {funcionario.ativo && podeInativar ? (
                            <Button size="sm" variant="ghost" className="rounded-xl text-[#6F767E] hover:text-rose-600" onClick={() => abrirModalInativacao(funcionario)}>
                              <UserX className="mr-1 h-3.5 w-3.5" />
                              Inativar
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <div className="flex flex-col gap-2 rounded-xl border border-slate-200/50 bg-white px-4 py-3 shadow-[0px_4px_20px_rgba(0,0,0,0.05)] sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[#6F767E]">{carregandoLista ? "Carregando..." : `Pagina ${paginacao.pagina} de ${paginacao.total_paginas} - ${paginacao.total} registros`}</p>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(porPagina)} onValueChange={(valor) => atualizarParametrosUrl({ por_pagina: valor }, true)}>
            <SelectTrigger className="h-10 w-[140px] rounded-full border-slate-200 bg-slate-50 text-sm">
              <SelectValue placeholder="Por pagina" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 / pagina</SelectItem>
              <SelectItem value="20">20 / pagina</SelectItem>
              <SelectItem value="50">50 / pagina</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" className="rounded-xl" disabled={paginacao.pagina <= 1 || carregandoLista} onClick={() => atualizarParametrosUrl({ pagina: String(Math.max(1, pagina - 1)) })}>
            Anterior
          </Button>

          <Button variant="outline" size="sm" className="rounded-xl" disabled={paginacao.pagina >= paginacao.total_paginas || carregandoLista} onClick={() => atualizarParametrosUrl({ pagina: String(Math.min(paginacao.total_paginas, pagina + 1)) })}>
            Proxima
          </Button>
        </div>
      </div>

      <Dialog
        open={dialogNovoFuncionarioAberto}
        onOpenChange={(aberto) => {
          setDialogNovoFuncionarioAberto(aberto);
          if (!aberto) {
            setErroCadastro(null);
          }
        }}
      >
        <DialogContent className="left-auto right-0 top-0 h-dvh w-full max-w-md translate-x-0 translate-y-0 rounded-none border-l border-slate-200/50 bg-white p-0">
          <div className="h-full overflow-y-auto p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-[#1A1D1F]">Adicionar colaborador</DialogTitle>
            </DialogHeader>

            <form className="mt-5 space-y-4" onSubmit={adicionarFuncionario}>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#1A1D1F]">Nome</label>
                <Input name="nome" placeholder="Nome completo" required className="rounded-xl border-slate-200 bg-slate-50" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#1A1D1F]">E-mail</label>
                <Input name="email" type="email" placeholder="email@exemplo.com" required className="rounded-xl border-slate-200 bg-slate-50" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#1A1D1F]">Senha</label>
                <Input name="senha" type="password" placeholder="Senha temporaria" required className="rounded-xl border-slate-200 bg-slate-50" />
              </div>

              <input type="hidden" name="cargo" value={cargoSelecionado} />
              <input type="hidden" name="id_pdv" value={pdvSelecionado} />

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#1A1D1F]">Cargo</label>
                <Select value={cargoSelecionado} onValueChange={setCargoSelecionado}>
                  <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50">
                    <SelectValue placeholder="Cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COLABORADOR">COLABORADOR</SelectItem>
                    <SelectItem value="GERENTE">GERENTE</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#1A1D1F]">PDV</label>
                <Select value={pdvSelecionado} onValueChange={setPdvSelecionado}>
                  <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50">
                    <SelectValue placeholder="Selecione o PDV" />
                  </SelectTrigger>
                  <SelectContent>
                    {pdvs.map((pdv) => (
                      <SelectItem key={pdv.id} value={pdv.id}>
                        {pdv.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {erroCadastro ? <p className="text-sm font-medium text-rose-700">{erroCadastro}</p> : null}

              <Button className="w-full rounded-xl" type="submit">Criar colaborador</Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogInativacaoAberto}
        onOpenChange={(aberto) => {
          setDialogInativacaoAberto(aberto);
          if (!aberto) {
            setFuncionarioDestinoInativacao(null);
            setDestinoInativacaoIndividual("");
            setObservacaoInativacaoIndividual("");
          }
        }}
      >
        <DialogContent className="max-w-md rounded-2xl border border-slate-200/50 bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-[#1A1D1F]">Inativar colaborador</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-[#6F767E]">
              Deseja inativar <span className="font-semibold text-[#1A1D1F]">{funcionarioDestinoInativacao?.nome}</span>? Selecione quem recebera os cards e responsabilidades.
            </p>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1A1D1F]">Destino da reatribuicao</label>
              <Select value={destinoInativacaoIndividual} onValueChange={setDestinoInativacaoIndividual}>
                <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50">
                  <SelectValue placeholder="Selecione o destino" />
                </SelectTrigger>
                <SelectContent>
                  {funcionariosAtivosParaDestino
                    .filter((funcionario) => funcionario.id !== funcionarioDestinoInativacao?.id)
                    .map((funcionario) => (
                      <SelectItem key={funcionario.id} value={funcionario.id}>
                        {funcionario.nome}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1A1D1F]">Observacao (opcional)</label>
              <Input
                placeholder="Motivo da inativacao"
                value={observacaoInativacaoIndividual}
                onChange={(e) => setObservacaoInativacaoIndividual(e.target.value)}
                className="rounded-xl border-slate-200 bg-slate-50"
              />
            </div>

            {erroLista ? <p className="text-sm font-medium text-rose-700">{erroLista}</p> : null}

            <div className="flex justify-end gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setDialogInativacaoAberto(false)}>Cancelar</Button>
              <Button variant="destructive" className="rounded-xl" disabled={executandoInativacaoIndividual} onClick={() => void confirmarInativacaoIndividual()}>
                {executandoInativacaoIndividual ? "Inativando..." : "Confirmar inativacao"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
