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
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Configuracoes</h1>
        <p className="text-sm text-sky-500">Gerencie PDVs e estagios do funil.</p>
      </div>

      {erro ? <p className="text-sm text-red-600">{erro}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>PDVs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form className="flex gap-2" onSubmit={criarPdv}>
            <Input name="nome" placeholder="Nome do PDV" required />
            <Button>Adicionar</Button>
          </form>

          {pdvs.map((pdv) => {
            const isTemporario = pdv.id.startsWith("temp-");

            return (
              <OptimisticSync key={`${pdv.id}-${pdv.nome}`} active={isTemporario} className="cursor-wait">
                <div className={isTemporario ? "flex cursor-wait gap-2" : "flex gap-2"}>
                  <Input
                    defaultValue={pdv.nome}
                    disabled={isTemporario}
                    onBlur={(e) => {
                      if (isTemporario) return;
                      void atualizarPdv(pdv.id, e.target.value);
                    }}
                  />
                  <Button
                    variant="destructive"
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Estagios do funil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {estagios.map((estagio) => (
            <div key={`${estagio.id}-${estagio.nome}-${estagio.ordem}`} className="grid gap-2 md:grid-cols-4">
              <Input
                defaultValue={estagio.nome}
                onBlur={(e) => atualizarEstagio(estagio.id, e.target.value, estagio.ordem)}
              />
              <Input
                type="number"
                defaultValue={estagio.ordem}
                onBlur={(e) => atualizarEstagio(estagio.id, estagio.nome, Number(e.target.value))}
              />
              <Input value={estagio.tipo} readOnly />
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
