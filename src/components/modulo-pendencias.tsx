"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formataMoeda, aplicaMascaraTelefoneBr } from "@/lib/utils";
import { LABELS_PENDENCIA, TipoPendencia } from "@/lib/validacoes";

type Lead = {
  id: string;
  nome: string;
  telefone: string;
  valor_consorcio: number;
  funcionario: {
    id: string;
    nome: string;
    pdv: {
      id: string;
      nome: string;
    };
  };
};

type Pendencia = {
  id: string;
  id_lead: string;
  tipo: string;
  descricao: string;
  documento_url: string | null;
  resolvida: boolean;
  resolvida_em: string | null;
  criado_em: string;
  lead: Lead;
};

type Props = {
  perfil: "EMPRESA" | "GERENTE" | "COLABORADOR";
  idUsuario: string;
};

export function ModuloPendencias({ perfil, idUsuario }: Props) {
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [pendenciaSelecionada, setPendenciaSelecionada] = useState<Pendencia | null>(null);
  const [dialogDetalhesAberto, setDialogDetalhesAberto] = useState(false);

  const [urlDocumento, setUrlDocumento] = useState("");
  const [marcarResolvida, setMarcarResolvida] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [filtroStatus, setFiltroStatus] = useState<"TODAS" | "PENDENTES" | "RESOLVIDAS">("PENDENTES");

  useEffect(() => {
    let ativo = true;

    const carregarPendencias = async () => {
      setCarregando(true);
      const resposta = await fetch("/api/pendencias");
      if (!ativo) return;

      if (resposta.ok) {
        const json = await resposta.json();
        setPendencias(json.pendencias ?? []);
      } else {
        setErro("Erro ao carregar pendências.");
      }
      setCarregando(false);
    };

    void carregarPendencias();

    return () => {
      ativo = false;
    };
  }, []);

  const pendenciasFiltradas = useMemo(() => {
    if (filtroStatus === "TODAS") return pendencias;
    if (filtroStatus === "PENDENTES") return pendencias.filter((p) => !p.resolvida);
    return pendencias.filter((p) => p.resolvida);
  }, [pendencias, filtroStatus]);

  const pendentesCount = useMemo(
    () => pendencias.filter((p) => !p.resolvida).length,
    [pendencias]
  );
  const resolvidasCount = useMemo(
    () => pendencias.filter((p) => p.resolvida).length,
    [pendencias]
  );

  // Função para detectar pendências automaticamente (apenas EMPRESA)
  async function detectarPendencias() {
    setErro(null);
    setCarregando(true);
    
    const resposta = await fetch("/api/pendencias", { method: "POST" });
    
    if (resposta.ok) {
      const json = await resposta.json();
      // Recarregar pendências
      const resPendencias = await fetch("/api/pendencias");
      if (resPendencias.ok) {
        const jsonP = await resPendencias.json();
        setPendencias(jsonP.pendencias ?? []);
      }
      alert(json.mensagem || "Detecção concluída!");
    } else {
      const json = await resposta.json();
      setErro(json.erro || "Erro ao detectar pendências.");
    }
    setCarregando(false);
  }

  async function abrirDetalhes(pendencia: Pendencia) {
    setPendenciaSelecionada(pendencia);
    setUrlDocumento(pendencia.documento_url ?? "");
    setMarcarResolvida(pendencia.resolvida);
    setDialogDetalhesAberto(true);
  }

  async function salvarPendencia() {
    if (!pendenciaSelecionada) return;
    setErro(null);
    setSalvando(true);

    const resposta = await fetch(`/api/pendencias/${pendenciaSelecionada.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documento_url: urlDocumento.trim() || null,
        resolvida: marcarResolvida,
      }),
    });

    if (!resposta.ok) {
      const json = await resposta.json();
      setErro(json.erro ?? "Erro ao salvar pendência.");
      setSalvando(false);
      return;
    }

    // Recarregar pendências
    const resPendencias = await fetch("/api/pendencias");
    if (resPendencias.ok) {
      const json = await resPendencias.json();
      setPendencias(json.pendencias ?? []);
    }

    setDialogDetalhesAberto(false);
    setPendenciaSelecionada(null);
    setSalvando(false);
  }

  return (
    <section className="space-y-5 rounded-2xl bg-slate-50/50 p-4 pb-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200/60 bg-white px-6 py-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200">
            <svg className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 md:text-2xl">Pendencias</h1>
            <p className="text-sm text-slate-500">
              Pendencias detectadas automaticamente nos deals.
            </p>
          </div>
        </div>

        {perfil === "EMPRESA" && (
          <Button className="w-full rounded-xl bg-slate-800 font-medium text-white hover:bg-slate-700 md:w-auto" onClick={detectarPendencias} disabled={carregando}>
            {carregando ? "Processando..." : "Detectar Pendencias"}
          </Button>
        )}
      </header>

      <section className="rounded-2xl border border-slate-200/60 bg-white px-5 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filtroStatus === "PENDENTES" ? "default" : "outline"}
            size="sm"
            className={filtroStatus === "PENDENTES" ? "rounded-xl bg-slate-800 font-medium" : "rounded-xl border-slate-200 bg-slate-50/80 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"}
            onClick={() => setFiltroStatus("PENDENTES")}
          >
            Pendentes ({pendentesCount})
          </Button>
          <Button
            variant={filtroStatus === "RESOLVIDAS" ? "default" : "outline"}
            size="sm"
            className={filtroStatus === "RESOLVIDAS" ? "rounded-xl bg-slate-800 font-medium" : "rounded-xl border-slate-200 bg-slate-50/80 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"}
            onClick={() => setFiltroStatus("RESOLVIDAS")}
          >
            Resolvidas ({resolvidasCount})
          </Button>
          <Button
            variant={filtroStatus === "TODAS" ? "default" : "outline"}
            size="sm"
            className={filtroStatus === "TODAS" ? "rounded-xl bg-slate-800 font-medium" : "rounded-xl border-slate-200 bg-slate-50/80 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"}
            onClick={() => setFiltroStatus("TODAS")}
          >
            Todas ({pendencias.length})
          </Button>
        </div>
      </section>

      {carregando ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200/60 bg-white py-16 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <p className="text-sm text-slate-500">Carregando pendencias...</p>
        </div>
      ) : pendenciasFiltradas.length === 0 ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200/60 bg-white py-16 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <p className="text-sm text-slate-500">
            Nenhuma pendencia encontrada.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {pendenciasFiltradas.map((pendencia) => (
            <Card
              key={pendencia.id}
              className="cursor-pointer rounded-2xl border border-slate-200/60 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
              onClick={() => abrirDetalhes(pendencia)}
            >
              <CardContent className="flex items-center justify-between p-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-800">{pendencia.lead.nome}</p>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                        pendencia.resolvida
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : "bg-rose-50 text-rose-700 border border-rose-100"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${pendencia.resolvida ? "bg-emerald-500" : "bg-rose-500"}`} />
                      {pendencia.resolvida ? "Resolvida" : "Pendente"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">
                    {LABELS_PENDENCIA[pendencia.tipo as TipoPendencia] || pendencia.tipo}
                  </p>
                  <p className="text-xs text-slate-400">
                    {pendencia.lead.funcionario.pdv.nome} -{" "}
                    {pendencia.lead.funcionario.nome}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-700">
                    {formataMoeda(pendencia.lead.valor_consorcio)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {pendencia.lead.telefone}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={dialogDetalhesAberto}
        onOpenChange={(aberto) => {
          setDialogDetalhesAberto(aberto);
          if (!aberto) {
            setPendenciaSelecionada(null);
            setErro(null);
          }
        }}
      >
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800">Detalhes da Pendencia</DialogTitle>
          </DialogHeader>

          {pendenciaSelecionada && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200/60 bg-slate-50/50 p-4">
                <p className="font-semibold text-slate-800">{pendenciaSelecionada.lead.nome}</p>
                <p className="text-sm text-slate-500">
                  {pendenciaSelecionada.lead.telefone}
                </p>
                <p className="text-sm font-medium text-slate-700">
                  {formataMoeda(pendenciaSelecionada.lead.valor_consorcio)}
                </p>
                <p className="text-xs text-slate-400">
                  {pendenciaSelecionada.lead.funcionario.pdv.nome} -{" "}
                  {pendenciaSelecionada.lead.funcionario.nome}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Tipo</p>
                <p className="text-sm font-medium text-slate-700">
                  {LABELS_PENDENCIA[pendenciaSelecionada.tipo as TipoPendencia] ||
                    pendenciaSelecionada.tipo}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Descricao</p>
                <p className="text-sm text-slate-600">{pendenciaSelecionada.descricao}</p>
              </div>

              {/* Campo para anexar documento - apenas para EMPRESA e GERENTE */}
              {(perfil === "EMPRESA" || perfil === "GERENTE") && (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">URL do Documento</p>
                  <Input
                    className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50"
                    placeholder="Cole a URL do documento (ex: carta de credito)"
                    value={urlDocumento}
                    onChange={(e) => setUrlDocumento(e.target.value)}
                  />
                  {pendenciaSelecionada.documento_url && (
                    <a
                      href={pendenciaSelecionada.documento_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block text-sm font-medium text-sky-600 hover:underline"
                    >
                      Ver documento atual
                    </a>
                  )}
                </div>
              )}

              {/* Checkbox para resolver - apenas para EMPRESA e GERENTE */}
              {(perfil === "EMPRESA" || perfil === "GERENTE") && (
                <div className="flex items-center gap-3 rounded-xl border border-slate-200/60 bg-slate-50/50 p-3">
                  <input
                    type="checkbox"
                    id="resolvida"
                    checked={marcarResolvida}
                    onChange={(e) => setMarcarResolvida(e.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-slate-600 focus:ring-slate-400 focus:ring-offset-2"
                  />
                  <label htmlFor="resolvida" className="text-sm font-medium text-slate-700">
                    Marcar como resolvida
                  </label>
                </div>
              )}

              {erro ? <p className="text-sm font-medium text-rose-600">{erro}</p> : null}

              {/* Botão salvar - apenas para EMPRESA e GERENTE */}
              {(perfil === "EMPRESA" || perfil === "GERENTE") && (
                <Button 
                  className="w-full rounded-xl bg-slate-800 font-medium text-white hover:bg-slate-700" 
                  onClick={salvarPendencia}
                  disabled={salvando}
                >
                  {salvando ? "Salvando..." : "Salvar"}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
