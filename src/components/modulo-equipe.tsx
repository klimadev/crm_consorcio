"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { 
  ArrowDown, 
  ArrowUp, 
  ArrowUpDown, 
  MoreHorizontal, 
  Pencil, 
  Search, 
  Shield, 
  ShieldUser, 
  Trash2, 
  TrendingUp, 
  UserCheck, 
  UserPlus, 
  UserX, 
  Users,
  X,
  Check
} from "lucide-react";
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

const PASTEL_COLORS = [
  { bg: "bg-violet-100", text: "text-violet-700", ring: "ring-violet-200" },
  { bg: "bg-blue-100", text: "text-blue-700", ring: "ring-blue-200" },
  { bg: "bg-emerald-100", text: "text-emerald-700", ring: "ring-emerald-200" },
  { bg: "bg-amber-100", text: "text-amber-700", ring: "ring-amber-200" },
  { bg: "bg-rose-100", text: "text-rose-700", ring: "ring-rose-200" },
  { bg: "bg-cyan-100", text: "text-cyan-700", ring: "ring-cyan-200" },
  { bg: "bg-indigo-100", text: "text-indigo-700", ring: "ring-indigo-200" },
  { bg: "bg-slate-100", text: "text-slate-700", ring: "ring-slate-200" },
];

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

function obterCorAvatar(nome: string) {
  const indice = nome.charCodeAt(0) % PASTEL_COLORS.length;
  return PASTEL_COLORS[indice];
}

function KpiCard({ 
  titulo, 
  valor, 
  icone: Icone, 
  cor, 
  tendencia 
}: { 
  titulo: string; 
  valor: number; 
  icone: React.ElementType; 
  cor: { bg: string; text: string; ring: string };
  tendencia?: { valor: number; positiva: boolean };
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white/80 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
      <div className={cn("absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full opacity-50", cor.bg)} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{titulo}</p>
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-white/60 backdrop-blur-sm shadow-sm", cor.bg)}>
            <Icone className={cn("h-5 w-5", cor.text)} />
          </div>
        </div>
        <div className="mt-4 flex items-end justify-between">
          <p className="text-4xl font-bold text-slate-800">{valor}</p>
          {tendencia && (
            <div className={cn("flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium", tendencia.positiva ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
              {tendencia.positiva ? <TrendingUp className="h-3 w-3" /> : <TrendingUp className="h-3 w-3 rotate-180" />}
              {tendencia.valor}%
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SkeletonTabela() {
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] md:block">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/80">
            <TableHead className="w-12"><div className="h-4 w-4 rounded bg-slate-200" /></TableHead>
            <TableHead><div className="h-4 w-16 rounded bg-slate-200" /></TableHead>
            <TableHead><div className="h-4 w-24 rounded bg-slate-200" /></TableHead>
            <TableHead><div className="h-4 w-20 rounded bg-slate-200" /></TableHead>
            <TableHead><div className="h-4 w-20 rounded bg-slate-200" /></TableHead>
            <TableHead><div className="h-4 w-16 rounded bg-slate-200" /></TableHead>
            <TableHead><div className="h-4 w-20 rounded bg-slate-200" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i} className="border-slate-100">
              <TableCell className="py-5"><div className="h-4 w-4 rounded bg-slate-200" /></TableCell>
              <TableCell className="py-5"><div className="flex items-center gap-3"><div className="h-9 w-9 rounded-xl bg-slate-200" /><div className="h-4 w-32 rounded bg-slate-200" /></div></TableCell>
              <TableCell className="py-5"><div className="h-4 w-40 rounded bg-slate-200" /></TableCell>
              <TableCell className="py-5"><div className="h-4 w-20 rounded bg-slate-200" /></TableCell>
              <TableCell className="py-5"><div className="h-4 w-24 rounded bg-slate-200" /></TableCell>
              <TableCell className="py-5"><div className="h-6 w-16 rounded-full bg-slate-200" /></TableCell>
              <TableCell className="py-5"><div className="h-8 w-24 rounded-lg bg-slate-200" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-slate-200/60 bg-white/80 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between">
            <div className="h-3 w-12 rounded bg-slate-200" />
            <div className="h-10 w-10 rounded-xl bg-slate-200" />
          </div>
          <div className="mt-4 h-9 w-16 rounded bg-slate-200" />
        </div>
      ))}
    </div>
  );
}

function LinhaAcoes({ 
  editando, 
  podeDesfazer, 
  statusSalvamento, 
  onEditar, 
  onCancelar, 
  onDesfazer, 
  onInativar 
}: { 
  editando: boolean; 
  podeDesfazer: boolean; 
  statusSalvamento: { estado: string; mensagem?: string } | null;
  onEditar: () => void; 
  onCancelar: () => void; 
  onDesfazer: () => void; 
  onInativar?: () => void;
}) {
  const [menuAberto, setMenuAberto] = useState(false);

  if (editando) {
    return (
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="h-8 rounded-lg border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900" onClick={onCancelar}>
          <X className="mr-1 h-3.5 w-3.5" />
          Cancelar
        </Button>
        <Button size="sm" variant="outline" className="h-8 rounded-lg border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900" disabled={!podeDesfazer || statusSalvamento?.estado === "saving"} onClick={onDesfazer}>
          <X className="mr-1 h-3.5 w-3.5" />
          Desfazer
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Button size="sm" variant="ghost" className="h-8 w-8 rounded-lg p-0 text-slate-400 hover:bg-slate-100 hover:text-slate-600" onClick={() => setMenuAberto(!menuAberto)}>
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {menuAberto && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuAberto(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
            <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50" onClick={() => { onEditar(); setMenuAberto(false); }}>
              <Pencil className="h-4 w-4" />
              Editar
            </button>
            {onInativar && (
              <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50" onClick={() => { onInativar(); setMenuAberto(false); }}>
                <Trash2 className="h-4 w-4" />
                Inativar
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ ativo }: { ativo: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
      ativo 
        ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
        : "bg-slate-100 text-slate-600 border border-slate-200",
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", ativo ? "bg-emerald-500" : "bg-slate-400")} />
      {ativo ? "Ativo" : "Inativo"}
    </span>
  );
}

function Avatar({ nome, tamanho = "md" }: { nome: string; tamanho?: "sm" | "md" | "lg" }) {
  const cor = obterCorAvatar(nome);
  const iniciais = obterIniciais(nome);
  
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-9 w-9 text-sm",
    lg: "h-12 w-12 text-base",
  };

  return (
    <span className={cn(
      "flex items-center justify-center rounded-xl font-semibold text-white shadow-sm ring-1 ring-black/5",
      sizes[tamanho],
      cor.bg.replace("bg-", "bg-gradient-to-br from-"),
      cor.text.replace("text-", "text-")
    )}>
      {iniciais}
    </span>
  );
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
      <section className="rounded-2xl border border-amber-200/50 bg-amber-50/50 p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100">
            <Shield className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">Acesso restrito</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-800">Sem permissao para acessar equipe</h2>
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600">
          Este modulo e visivel apenas para perfis de gestao. Solicite ao administrador da empresa a elevacao de permissao.
        </p>
      </section>
    );
  }

  const todosDaPaginaSelecionados = funcionarios.length > 0 && funcionarios.every((item) => idsSelecionados.includes(item.id));
  const itensKpi = [
    { titulo: "Total", valor: kpis.total, icone: Users, cor: { bg: "bg-slate-100", text: "text-slate-600", ring: "ring-slate-200" }, tendencia: { valor: 12, positiva: true } },
    { titulo: "Ativos", valor: kpis.ativos, icone: UserCheck, cor: { bg: "bg-emerald-100", text: "text-emerald-600", ring: "ring-emerald-200" }, tendencia: { valor: 8, positiva: true } },
    { titulo: "Inativos", valor: kpis.inativos, icone: UserX, cor: { bg: "bg-rose-100", text: "text-rose-600", ring: "ring-rose-200" }, tendencia: { valor: 3, positiva: false } },
    { titulo: "Gerentes", valor: kpis.gerentes, icone: ShieldUser, cor: { bg: "bg-violet-100", text: "text-violet-600", ring: "ring-violet-200" }, tendencia: { valor: 5, positiva: true } },
    { titulo: "Colaboradores", valor: kpis.colaboradores, icone: Shield, cor: { bg: "bg-blue-100", text: "text-blue-600", ring: "ring-blue-200" }, tendencia: { valor: 2, positiva: true } },
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

    return direcao === "asc" ? <ArrowUp className="h-3.5 w-3.5 text-slate-700" /> : <ArrowDown className="h-3.5 w-3.5 text-slate-700" />;
  }

  return (
    <section className="space-y-5 rounded-2xl bg-slate-50/50 p-4 pb-6 md:p-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200/60 bg-white px-6 py-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200">
            <Users className="h-6 w-6 text-slate-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 md:text-2xl">Equipe e Operacao</h1>
            <p className="text-sm text-slate-500">{coberturaAtiva}</p>
          </div>
        </div>

        {podeGerenciarEmpresa ? (
          <Button className="w-full rounded-xl bg-slate-800 font-medium text-white hover:bg-slate-700 md:w-auto" onClick={() => setDialogNovoFuncionarioAberto(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Adicionar colaborador
          </Button>
        ) : null}
      </header>

      {erroLista ? (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200/60 bg-rose-50/50 px-4 py-3 shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100">
            <X className="h-4 w-4 text-rose-600" />
          </div>
          <p className="text-sm font-medium text-rose-700">{erroLista}</p>
        </div>
      ) : null}

      {carregandoLista ? (
        <SkeletonCard />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {itensKpi.map((item) => (
            <KpiCard
              key={item.titulo}
              titulo={item.titulo}
              valor={item.valor}
              icone={item.icone}
              cor={item.cor}
              tendencia={item.tendencia}
            />
          ))}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200/60 bg-white px-5 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="h-11 rounded-xl border-slate-200 bg-slate-50/80 pl-10 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50"
              placeholder="Buscar por nome, email ou PDV..."
              value={busca}
              onChange={(e) => atualizarParametrosUrl({ busca: e.target.value || null }, true)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFiltro} onValueChange={(valor) => atualizarParametrosUrl({ status: valor }, true)}>
              <SelectTrigger className="h-10 w-auto min-w-[140px] rounded-xl border-slate-200 bg-slate-50/80 px-4 text-sm font-medium text-slate-600">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="ATIVO">Ativos</SelectItem>
                <SelectItem value="INATIVO">Inativos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={cargoFiltro} onValueChange={(valor) => atualizarParametrosUrl({ cargo: valor }, true)}>
              <SelectTrigger className="h-10 w-auto min-w-[140px] rounded-xl border-slate-200 bg-slate-50/80 px-4 text-sm font-medium text-slate-600">
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
        <section className="space-y-3 rounded-xl border border-blue-200/40 bg-blue-50/30 px-5 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100">
                <Check className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-sm font-medium text-slate-700">
                <span className="font-semibold text-blue-600">{idsSelecionados.length}</span> colaboradores selecionados
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select value={acaoLote} onValueChange={(valor) => setAcaoLote(valor as AcaoLote)}>
                <SelectTrigger className="h-10 w-full sm:w-[200px] rounded-xl border-slate-300 bg-white text-sm font-medium">
                  <SelectValue placeholder="Acao" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ATIVAR">Ativar</SelectItem>
                  <SelectItem value="INATIVAR">Inativar</SelectItem>
                  <SelectItem value="ALTERAR_CARGO">Mudar cargo</SelectItem>
                  <SelectItem value="ALTERAR_PDV">Mudar PDV</SelectItem>
                </SelectContent>
              </Select>

              <Button size="sm" className="rounded-xl bg-slate-800 font-medium text-white hover:bg-slate-700" onClick={() => void executarAcaoLote()} disabled={executandoLote || idsSelecionados.length === 0}>
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

          {erroLote ? <p className="text-sm font-medium text-rose-600">{erroLote}</p> : null}
          {resultadoLote ? <p className="text-sm text-slate-600">Atualizados: {resultadoLote.atualizados} de {resultadoLote.processados}.</p> : null}
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-slate-200/60 bg-white px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <p className="text-sm font-medium text-slate-500">{carregandoLista ? "Atualizando registros..." : `${paginacao.total} registros no resultado atual.`}</p>
        </div>

        <div className="space-y-3 md:hidden">
          {funcionarios.length === 0 && !carregandoLista ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/60 bg-white py-16 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <Users className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-lg font-semibold text-slate-700">Nenhum colaborador encontrado</p>
              <p className="mt-1 max-w-xs text-sm text-slate-500">Adicione seu primeiro colaborador para comecar a gerenciar sua equipe.</p>
              {podeGerenciarEmpresa && (
                <Button className="mt-6 rounded-xl bg-slate-800 font-medium text-white hover:bg-slate-700" onClick={() => setDialogNovoFuncionarioAberto(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Adicionar colaborador
                </Button>
              )}
            </div>
          ) : (
            funcionarios.map((funcionario) => {
              const estaEditando = editandoId === funcionario.id && !!dadosEdicao;
              const statusLinha = statusSalvamento.id === funcionario.id ? statusSalvamento : null;
              const podeDesfazer = ultimoSnapshot?.id === funcionario.id;

              return (
                <article key={funcionario.id} className="space-y-4 rounded-2xl border border-slate-200/60 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar nome={funcionario.nome} tamanho="md" />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{funcionario.nome}</p>
                        <p className="text-xs text-slate-500">{funcionario.email}</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={idsSelecionados.includes(funcionario.id)}
                      onChange={(e) => alternarSelecao(funcionario.id, e.target.checked)}
                      className="h-5 w-5 rounded border-slate-300 text-slate-600 focus:ring-slate-400 focus:ring-offset-2"
                      aria-label={`Selecionar ${funcionario.nome}`}
                    />
                  </div>

                  {estaEditando && dadosEdicao ? (
                    <div className="space-y-3 rounded-xl bg-slate-50/50 p-4">
                      <Input value={dadosEdicao.nome} onChange={(e) => aoMudarDado("nome", e.target.value)} className="rounded-xl border-slate-200 bg-white" placeholder="Nome" />
                      {errosEdicao.nome ? <p className="text-xs font-medium text-rose-600">{errosEdicao.nome}</p> : null}

                      <Input value={dadosEdicao.email} onChange={(e) => aoMudarDado("email", e.target.value)} className="rounded-xl border-slate-200 bg-white" placeholder="E-mail" />
                      {errosEdicao.email ? <p className="text-xs font-medium text-rose-600">{errosEdicao.email}</p> : null}

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
                      <span className="font-medium text-slate-500">{funcionario.cargo}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-500">{funcionario.pdv?.nome}</span>
                      <StatusBadge ativo={funcionario.ativo} />
                    </div>
                  )}

                  {statusLinha?.estado === "saving" ? <p className="text-xs font-medium text-amber-600">{statusLinha.mensagem}</p> : null}
                  {statusLinha?.estado === "saved" ? <p className="text-xs font-medium text-emerald-600">{statusLinha.mensagem}</p> : null}
                  {statusLinha?.estado === "error" ? <p className="text-xs font-medium text-rose-600">{statusLinha.mensagem}</p> : null}

                  <div className="flex flex-wrap gap-2">
                    {estaEditando ? (
                      <>
                        <Button size="sm" variant="outline" className="rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50" onClick={cancelarEdicao}>Fechar</Button>
                        <Button size="sm" variant="outline" className="rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50" disabled={!podeDesfazer || statusLinha?.estado === "saving"} onClick={() => void desfazerUltimaEdicao()}>
                          Desfazer
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="ghost" className="rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700" onClick={() => iniciarEdicao(funcionario)}>
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          Editar
                        </Button>

                        {funcionario.ativo && podeInativar ? (
                          <Button size="sm" variant="ghost" className="rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => abrirModalInativacao(funcionario)}>
                            <UserX className="mr-1.5 h-3.5 w-3.5" />
                            Inativar
                          </Button>
                        ) : null}
                      </>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>

        {funcionarios.length === 0 && !carregandoLista ? (
          <div className="hidden flex-col items-center justify-center rounded-2xl border border-slate-200/60 bg-white py-20 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)] md:flex">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100">
              <Users className="h-10 w-10 text-slate-400" />
            </div>
            <p className="text-xl font-semibold text-slate-700">Nenhum colaborador encontrado</p>
            <p className="mt-2 max-w-md text-sm text-slate-500">Adicione seu primeiro colaborador para comecar a gerenciar sua equipe e operacoes.</p>
            {podeGerenciarEmpresa && (
              <Button className="mt-8 rounded-xl bg-slate-800 font-medium text-white hover:bg-slate-700" onClick={() => setDialogNovoFuncionarioAberto(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Adicionar colaborador
              </Button>
            )}
          </div>
        ) : (
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] md:block">
            {carregandoLista ? (
              <SkeletonTabela />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200/60 bg-slate-50/80 hover:bg-slate-50/80">
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={todosDaPaginaSelecionados}
                        onChange={(e) => alternarSelecaoPagina(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-400"
                        aria-label="Selecionar todos da pagina"
                      />
                    </TableHead>
                    <TableHead className="text-slate-500">
                      <button type="button" className="inline-flex items-center gap-1.5 font-medium hover:text-slate-700" onClick={() => alternarOrdenacao("nome")}>
                        Nome
                        {iconeOrdenacao("nome")}
                      </button>
                    </TableHead>
                    <TableHead className="text-slate-500">
                      <button type="button" className="inline-flex items-center gap-1.5 font-medium hover:text-slate-700" onClick={() => alternarOrdenacao("email")}>
                        E-mail
                        {iconeOrdenacao("email")}
                      </button>
                    </TableHead>
                    <TableHead className="text-slate-500">
                      <button type="button" className="inline-flex items-center gap-1.5 font-medium hover:text-slate-700" onClick={() => alternarOrdenacao("cargo")}>
                        Cargo
                        {iconeOrdenacao("cargo")}
                      </button>
                    </TableHead>
                    <TableHead className="text-slate-500">PDV</TableHead>
                    <TableHead className="text-slate-500">Status</TableHead>
                    <TableHead className="text-slate-500 w-20">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {funcionarios.map((funcionario) => {
                    const estaEditando = editandoId === funcionario.id && !!dadosEdicao;
                    const statusLinha = statusSalvamento.id === funcionario.id ? statusSalvamento : null;
                    const podeDesfazer = ultimoSnapshot?.id === funcionario.id;

                    return (
                      <TableRow key={funcionario.id} className="border-slate-100 transition-all duration-150 hover:bg-slate-50/60">
                        <TableCell className="py-4">
                          <input
                            type="checkbox"
                            checked={idsSelecionados.includes(funcionario.id)}
                            onChange={(e) => alternarSelecao(funcionario.id, e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-400"
                            aria-label={`Selecionar ${funcionario.nome}`}
                          />
                        </TableCell>

                        <TableCell className="py-4">
                          {estaEditando && dadosEdicao ? (
                            <div className="space-y-1.5">
                              <Input value={dadosEdicao.nome} onChange={(e) => aoMudarDado("nome", e.target.value)} className="h-9 rounded-xl border-slate-200 bg-white" />
                              {errosEdicao.nome ? <p className="text-xs font-medium text-rose-600">{errosEdicao.nome}</p> : null}
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <Avatar nome={funcionario.nome} tamanho="sm" />
                              <span className="font-medium text-slate-700">{funcionario.nome}</span>
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="py-4">
                          {estaEditando && dadosEdicao ? (
                            <div className="space-y-1.5">
                              <Input value={dadosEdicao.email} onChange={(e) => aoMudarDado("email", e.target.value)} className="h-9 rounded-xl border-slate-200 bg-white" />
                              {errosEdicao.email ? <p className="text-xs font-medium text-rose-600">{errosEdicao.email}</p> : null}
                            </div>
                          ) : (
                            <span className="text-slate-500">{funcionario.email}</span>
                          )}
                        </TableCell>

                        <TableCell className="py-4">
                          {estaEditando && dadosEdicao ? (
                            <div className="space-y-1.5">
                              <Select value={dadosEdicao.cargo} onValueChange={(valor) => aoMudarDado("cargo", valor)}>
                                <SelectTrigger className="h-9 w-full text-sm sm:w-36 rounded-xl">
                                  <SelectValue placeholder="Cargo" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="COLABORADOR">COLABORADOR</SelectItem>
                                  <SelectItem value="GERENTE">GERENTE</SelectItem>
                                </SelectContent>
                              </Select>
                              {errosEdicao.cargo ? <p className="text-xs font-medium text-rose-600">{errosEdicao.cargo}</p> : null}
                            </div>
                          ) : (
                            <span className="font-medium text-slate-700">{funcionario.cargo}</span>
                          )}
                        </TableCell>

                        <TableCell className="py-4">
                          {estaEditando && dadosEdicao ? (
                            <div className="space-y-1.5">
                              <Select value={dadosEdicao.id_pdv} onValueChange={(valor) => aoMudarDado("id_pdv", valor)}>
                                <SelectTrigger className="h-9 w-full text-sm sm:w-40 rounded-xl">
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
                              {errosEdicao.id_pdv ? <p className="text-xs font-medium text-rose-600">{errosEdicao.id_pdv}</p> : null}
                            </div>
                          ) : (
                            <span className="text-slate-500">{funcionario.pdv?.nome}</span>
                          )}
                        </TableCell>

                        <TableCell className="py-4">
                          <StatusBadge ativo={funcionario.ativo} />
                        </TableCell>

                        <TableCell className="py-4">
                          <div className="space-y-2">
                            {statusLinha?.estado === "saving" ? <p className="text-xs font-medium text-amber-600">{statusLinha.mensagem}</p> : null}
                            {statusLinha?.estado === "saved" ? <p className="text-xs font-medium text-emerald-600">{statusLinha.mensagem}</p> : null}
                            {statusLinha?.estado === "error" ? <p className="text-xs font-medium text-rose-600">{statusLinha.mensagem}</p> : null}

                            <LinhaAcoes
                              editando={estaEditando}
                              podeDesfazer={!!podeDesfazer}
                              statusSalvamento={statusLinha}
                              onEditar={() => iniciarEdicao(funcionario)}
                              onCancelar={cancelarEdicao}
                              onDesfazer={() => void desfazerUltimaEdicao()}
                              onInativar={funcionario.ativo && podeInativar ? () => abrirModalInativacao(funcionario) : undefined}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </section>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200/60 bg-white px-5 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-slate-500">{carregandoLista ? "Carregando..." : `Pagina ${paginacao.pagina} de ${paginacao.total_paginas} - ${paginacao.total} registros`}</p>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(porPagina)} onValueChange={(valor) => atualizarParametrosUrl({ por_pagina: valor }, true)}>
            <SelectTrigger className="h-9 w-[130px] rounded-lg border-slate-200 bg-slate-50/80 text-sm font-medium text-slate-600">
              <SelectValue placeholder="Por pagina" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 / pagina</SelectItem>
              <SelectItem value="20">20 / pagina</SelectItem>
              <SelectItem value="50">50 / pagina</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" className="h-9 rounded-lg border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50" disabled={paginacao.pagina <= 1 || carregandoLista} onClick={() => atualizarParametrosUrl({ pagina: String(Math.max(1, pagina - 1)) })}>
            Anterior
          </Button>

          <Button variant="outline" size="sm" className="h-9 rounded-lg border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50" disabled={paginacao.pagina >= paginacao.total_paginas || carregandoLista} onClick={() => atualizarParametrosUrl({ pagina: String(Math.min(paginacao.total_paginas, pagina + 1)) })}>
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
        <DialogContent className="left-auto right-0 top-0 h-dvh w-full max-w-md translate-x-0 translate-y-0 rounded-none border-l border-slate-200/60 bg-white p-0">
          <div className="flex h-full flex-col">
            <div className="border-b border-slate-100 px-6 py-5">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-slate-800">Adicionar colaborador</DialogTitle>
              </DialogHeader>
              <p className="mt-1 text-sm text-slate-500">Preencha os dados para criar um novo membro na equipe.</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <form className="space-y-6" onSubmit={adicionarFuncionario}>
                <section className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Informacoes Pessoais</h3>
                  
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Nome completo</label>
                    <Input 
                      name="nome" 
                      placeholder="Ex: Joao Silva" 
                      required 
                      className="rounded-xl border-slate-200 bg-slate-50/50 text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50" 
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">E-mail</label>
                    <Input 
                      name="email" 
                      type="email" 
                      placeholder="joao@empresa.com" 
                      required 
                      className="rounded-xl border-slate-200 bg-slate-50/50 text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50" 
                    />
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Acesso ao Sistema</h3>
                  
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Senha temporaria</label>
                    <Input 
                      name="senha" 
                      type="password" 
                      placeholder="Minimo 6 caracteres" 
                      required 
                      minLength={6}
                      className="rounded-xl border-slate-200 bg-slate-50/50 text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50" 
                    />
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Permissoes e Localizacao</h3>
                  
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Cargo</label>
                    <input type="hidden" name="cargo" value={cargoSelecionado} />
                    <Select value={cargoSelecionado} onValueChange={setCargoSelecionado}>
                      <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 text-slate-700 focus:border-slate-400 focus:ring-2 focus:ring-slate-200/50">
                        <SelectValue placeholder="Selecione o cargo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COLABORADOR">COLABORADOR</SelectItem>
                        <SelectItem value="GERENTE">GERENTE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">PDV</label>
                    <input type="hidden" name="id_pdv" value={pdvSelecionado} />
                    <Select value={pdvSelecionado} onValueChange={setPdvSelecionado}>
                      <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 text-slate-700 focus:border-slate-400 focus:ring-2 focus:ring-slate-200/50">
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
                </section>

                {erroCadastro ? (
                  <div className="flex items-center gap-2 rounded-xl border border-rose-200/60 bg-rose-50/50 px-4 py-3">
                    <X className="h-4 w-4 text-rose-500" />
                    <p className="text-sm font-medium text-rose-600">{erroCadastro}</p>
                  </div>
                ) : null}
              </form>
            </div>

            <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4">
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl border-slate-200 bg-white text-slate-600 hover:bg-slate-50" onClick={() => setDialogNovoFuncionarioAberto(false)}>
                  Cancelar
                </Button>
                <Button className="flex-1 rounded-xl bg-slate-800 font-medium text-white hover:bg-slate-700" onClick={(e) => {
                  const form = (e.target as HTMLButtonElement).closest("form");
                  if (form) {
                    adicionarFuncionario(new Event("submit", { bubbles: true }) as unknown as React.FormEvent<HTMLFormElement>);
                  }
                }}>
                  <Check className="mr-2 h-4 w-4" />
                  Criar colaborador
                </Button>
              </div>
            </div>
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
        <DialogContent className="max-w-md rounded-2xl border border-slate-200/60 bg-white">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100">
                <UserX className="h-5 w-5 text-rose-600" />
              </div>
              <DialogTitle className="text-xl font-bold text-slate-800">Inativar colaborador</DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-5">
            <p className="text-sm text-slate-600">
              Deseja inativar <span className="font-semibold text-slate-800">{funcionarioDestinoInativacao?.nome}</span>? Selecione quem recebera os cards e responsabilidades.
            </p>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Destino da reatribuicao</label>
              <Select value={destinoInativacaoIndividual} onValueChange={setDestinoInativacaoIndividual}>
                <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 text-slate-700 focus:border-slate-400 focus:ring-2 focus:ring-slate-200/50">
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

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Observacao (opcional)</label>
              <Input
                placeholder="Motivo da inativacao"
                value={observacaoInativacaoIndividual}
                onChange={(e) => setObservacaoInativacaoIndividual(e.target.value)}
                className="rounded-xl border-slate-200 bg-slate-50/50 text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50"
              />
            </div>

            {erroLista ? <p className="text-sm font-medium text-rose-600">{erroLista}</p> : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" className="rounded-xl border-slate-200 bg-white text-slate-600 hover:bg-slate-50" onClick={() => setDialogInativacaoAberto(false)}>Cancelar</Button>
              <Button variant="destructive" className="rounded-xl bg-rose-600 font-medium text-white hover:bg-rose-700" disabled={executandoInativacaoIndividual} onClick={() => void confirmarInativacaoIndividual()}>
                {executandoInativacaoIndividual ? "Inativando..." : "Confirmar inativacao"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
