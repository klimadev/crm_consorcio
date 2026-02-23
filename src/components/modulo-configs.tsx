"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OptimisticSync } from "@/components/ui/optimistic-sync";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Pdv = { id: string; nome: string };
type Estagio = { id: string; nome: string; ordem: number; tipo: string };

export function ModuloConfigs() {
  const [pdvs, setPdvs] = useState<Pdv[]>([]);
  const [estagios, setEstagios] = useState<Estagio[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  function ordenarPdvs(lista: Pdv[]) {
    return [...lista].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }

  useEffect(() => {
    let ativo = true;

    const carregarInicial = async () => {
      const [resPdvs, resEstagios] = await Promise.all([
        fetch("/api/pdvs"),
        fetch("/api/estagios"),
      ]);

      if (!ativo) return;

      if (resPdvs.ok) {
        const json = await resPdvs.json();
        setPdvs(json.pdvs ?? []);
      }

      if (resEstagios.ok) {
        const json = await resEstagios.json();
        setEstagios(json.estagios ?? []);
      }
    };

    void carregarInicial();

    return () => {
      ativo = false;
    };
  }, []);

  async function criarPdv(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    const dados = new FormData(evento.currentTarget);
    const nome = String(dados.get("nome") ?? "").trim();
    if (!nome) return;

    const idTemporario = `temp-${Date.now()}`;
    const pdvTemporario: Pdv = { id: idTemporario, nome };

    setPdvs((atual) => ordenarPdvs([...atual, pdvTemporario]));

    const resposta = await fetch("/api/pdvs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome }),
    });

    if (!resposta.ok) {
      const json = (await resposta.json()) as { erro?: string };
      setErro(json.erro ?? "Erro ao adicionar PDV.");
      setPdvs((atual) => atual.filter((item) => item.id !== idTemporario));
      return;
    }

    const json = (await resposta.json()) as { pdv?: Pdv };
    if (json.pdv) {
      const pdvCriado = json.pdv;
      setPdvs((atual) =>
        ordenarPdvs(atual.map((item) => (item.id === idTemporario ? pdvCriado : item))),
      );
    }

    evento.currentTarget.reset();
  }

  async function atualizarPdv(id: string, nome: string) {
    if (id.startsWith("temp-")) return;
    setErro(null);
    const nomeAtualizado = nome.trim();
    if (!nomeAtualizado) return;

    const pdvAnterior = pdvs.find((item) => item.id === id);
    if (!pdvAnterior) return;

    setPdvs((atual) =>
      ordenarPdvs(
        atual.map((item) => (item.id === id ? { ...item, nome: nomeAtualizado } : item)),
      ),
    );

    const resposta = await fetch(`/api/pdvs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nomeAtualizado }),
    });

    if (!resposta.ok) {
      const json = (await resposta.json()) as { erro?: string };
      setErro(json.erro ?? "Erro ao atualizar PDV.");
      setPdvs((atual) =>
        ordenarPdvs(atual.map((item) => (item.id === id ? pdvAnterior : item))),
      );
    }
  }

  async function excluirPdv(id: string) {
    if (id.startsWith("temp-")) return;
    setErro(null);
    const pdvAnterior = pdvs.find((item) => item.id === id);
    if (!pdvAnterior) return;

    setPdvs((atual) => atual.filter((item) => item.id !== id));

    const resposta = await fetch(`/api/pdvs/${id}`, { method: "DELETE" });
    if (!resposta.ok) {
      const json = (await resposta.json()) as { erro?: string };
      setErro(json.erro ?? "Erro ao excluir PDV.");
      setPdvs((atual) => ordenarPdvs([...atual, pdvAnterior]));
    }
  }

  async function atualizarEstagio(id: string, nome: string, ordem: number) {
    setErro(null);
    const estagioAnterior = estagios.find((item) => item.id === id);
    if (!estagioAnterior) return;

    const nomeAtualizado = nome.trim();
    if (!nomeAtualizado) return;

    setEstagios((atual) =>
      atual.map((item) =>
        item.id === id ? { ...item, nome: nomeAtualizado, ordem } : item,
      ),
    );

    const resposta = await fetch(`/api/estagios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nomeAtualizado, ordem }),
    });

    if (!resposta.ok) {
      const json = (await resposta.json()) as { erro?: string };
      setErro(json.erro ?? "Erro ao atualizar estagio.");
      setEstagios((atual) =>
        atual.map((item) => (item.id === id ? estagioAnterior : item)),
      );
    }
  }

  return (
    <section className="space-y-5 rounded-2xl bg-slate-50/50 p-4 pb-6 md:p-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200/60 bg-white px-6 py-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200">
            <svg className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 md:text-2xl">Configuracoes</h1>
            <p className="text-sm text-slate-500">Gerencie PDVs e estagios do funil.</p>
          </div>
        </div>
      </header>

      {erro ? (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200/60 bg-rose-50/50 px-4 py-3 shadow-sm">
          <p className="text-sm font-medium text-rose-700">{erro}</p>
        </div>
      ) : null}

      <Card className="rounded-2xl border border-slate-200/60 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader className="border-b border-slate-100 px-6 py-4">
          <CardTitle className="text-lg font-bold text-slate-800">PDVs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <form className="flex gap-3" onSubmit={criarPdv}>
            <Input className="h-11 rounded-xl border-slate-200 bg-slate-50/80 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50" name="nome" placeholder="Nome do PDV" required />
            <Button className="rounded-xl bg-slate-800 font-medium text-white hover:bg-slate-700">Adicionar</Button>
          </form>

          <div className="space-y-2">
            {pdvs.map((pdv) => {
              const isTemporario = pdv.id.startsWith("temp-");

              return (
                <OptimisticSync key={`${pdv.id}-${pdv.nome}`} active={isTemporario} className="cursor-wait">
                  <div className={isTemporario ? "flex cursor-wait gap-2" : "flex gap-2"}>
                    <Input
                      className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50"
                      defaultValue={pdv.nome}
                      disabled={isTemporario}
                      onBlur={(e) => {
                        if (isTemporario) return;
                        void atualizarPdv(pdv.id, e.target.value);
                      }}
                    />
                    <Button
                      className="rounded-xl border border-rose-200 bg-white text-sm font-medium text-rose-600 hover:bg-rose-50"
                      variant="outline"
                      disabled={isTemporario}
                      onClick={() => {
                        if (isTemporario) return;
                        void excluirPdv(pdv.id);
                      }}
                    >
                      Excluir
                    </Button>
                  </div>
                </OptimisticSync>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-slate-200/60 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader className="border-b border-slate-100 px-6 py-4">
          <CardTitle className="text-lg font-bold text-slate-800">Estagios do funil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-6">
          {estagios.map((estagio) => (
            <div key={`${estagio.id}-${estagio.nome}-${estagio.ordem}`} className="grid gap-2 md:grid-cols-4">
              <Input
                className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50"
                defaultValue={estagio.nome}
                onBlur={(e) => atualizarEstagio(estagio.id, e.target.value, estagio.ordem)}
              />
              <Input
                className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50"
                type="number"
                defaultValue={estagio.ordem}
                onBlur={(e) => atualizarEstagio(estagio.id, estagio.nome, Number(e.target.value))}
              />
              <Input className="h-10 rounded-xl border-slate-200 bg-slate-100 text-sm text-slate-500" value={estagio.tipo} readOnly />
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
