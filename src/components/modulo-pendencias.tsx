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
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Pendências</h1>
          <p className="text-sm text-sky-500">
            Pendências detectadas automaticamente nos deals.
          </p>
        </div>

        {/* Botão para detectar pendências - apenas para EMPRESA */}
        {perfil === "EMPRESA" && (
          <Button onClick={detectarPendencias} disabled={carregando}>
            {carregando ? "Processando..." : "Detectar Pendências"}
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          variant={filtroStatus === "PENDENTES" ? "default" : "outline"}
          size="sm"
          onClick={() => setFiltroStatus("PENDENTES")}
        >
          Pendentes ({pendentesCount})
        </Button>
        <Button
          variant={filtroStatus === "RESOLVIDAS" ? "default" : "outline"}
          size="sm"
          onClick={() => setFiltroStatus("RESOLVIDAS")}
        >
          Resolvidas ({resolvidasCount})
        </Button>
        <Button
          variant={filtroStatus === "TODAS" ? "default" : "outline"}
          size="sm"
          onClick={() => setFiltroStatus("TODAS")}
        >
          Todas ({pendencias.length})
        </Button>
      </div>

      {carregando ? (
        <p className="text-center text-slate-500">Carregando pendências...</p>
      ) : pendenciasFiltradas.length === 0 ? (
        <p className="text-center text-slate-500">
          Nenhuma pendência encontrada.
        </p>
      ) : (
        <div className="grid gap-3">
          {pendenciasFiltradas.map((pendencia) => (
            <Card
              key={pendencia.id}
              className="cursor-pointer hover:bg-slate-50"
              onClick={() => abrirDetalhes(pendencia)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{pendencia.lead.nome}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        pendencia.resolvida
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
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
                  <p className="text-sm font-medium">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Pendência</DialogTitle>
          </DialogHeader>

          {pendenciaSelecionada && (
            <div className="space-y-4">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="font-medium">{pendenciaSelecionada.lead.nome}</p>
                <p className="text-sm text-slate-500">
                  {pendenciaSelecionada.lead.telefone}
                </p>
                <p className="text-sm">
                  {formataMoeda(pendenciaSelecionada.lead.valor_consorcio)}
                </p>
                <p className="text-xs text-slate-400">
                  {pendenciaSelecionada.lead.funcionario.pdv.nome} -{" "}
                  {pendenciaSelecionada.lead.funcionario.nome}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium">Tipo</p>
                <p className="text-sm text-slate-600">
                  {LABELS_PENDENCIA[pendenciaSelecionada.tipo as TipoPendencia] ||
                    pendenciaSelecionada.tipo}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium">Descrição</p>
                <p className="text-sm text-slate-600">{pendenciaSelecionada.descricao}</p>
              </div>

              {/* Campo para anexar documento - apenas para EMPRESA e GERENTE */}
              {(perfil === "EMPRESA" || perfil === "GERENTE") && (
                <div>
                  <p className="text-sm font-medium">URL do Documento</p>
                  <Input
                    placeholder="Cole a URL do documento (ex: carta de crédito)"
                    value={urlDocumento}
                    onChange={(e) => setUrlDocumento(e.target.value)}
                  />
                  {pendenciaSelecionada.documento_url && (
                    <a
                      href={pendenciaSelecionada.documento_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block text-sm text-sky-500 hover:underline"
                    >
                      Ver documento atual
                    </a>
                  )}
                </div>
              )}

              {/* Checkbox para resolver - apenas para EMPRESA e GERENTE */}
              {(perfil === "EMPRESA" || perfil === "GERENTE") && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="resolvida"
                    checked={marcarResolvida}
                    onChange={(e) => setMarcarResolvida(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <label htmlFor="resolvida" className="text-sm">
                    Marcar como resolvida
                  </label>
                </div>
              )}

              {erro ? <p className="text-sm text-red-600">{erro}</p> : null}

              {/* Botão salvar - apenas para EMPRESA e GERENTE */}
              {(perfil === "EMPRESA" || perfil === "GERENTE") && (
                <Button 
                  className="w-full" 
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
