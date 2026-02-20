"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Pdv = { id: string; nome: string };
type Estagio = { id: string; nome: string; ordem: number; tipo: string };

export function ModuloConfigs() {
  const [pdvs, setPdvs] = useState<Pdv[]>([]);
  const [estagios, setEstagios] = useState<Estagio[]>([]);

  async function carregar() {
    const [resPdvs, resEstagios] = await Promise.all([
      fetch("/api/pdvs"),
      fetch("/api/estagios"),
    ]);

    if (resPdvs.ok) {
      const json = await resPdvs.json();
      setPdvs(json.pdvs ?? []);
    }

    if (resEstagios.ok) {
      const json = await resEstagios.json();
      setEstagios(json.estagios ?? []);
    }
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
    const dados = new FormData(evento.currentTarget);

    await fetch("/api/pdvs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: dados.get("nome") }),
    });

    evento.currentTarget.reset();
    await carregar();
  }

  async function atualizarPdv(id: string, nome: string) {
    await fetch(`/api/pdvs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome }),
    });
    await carregar();
  }

  async function excluirPdv(id: string) {
    await fetch(`/api/pdvs/${id}`, { method: "DELETE" });
    await carregar();
  }

  async function atualizarEstagio(id: string, nome: string, ordem: number) {
    await fetch(`/api/estagios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, ordem }),
    });
    await carregar();
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Configuracoes</h1>
        <p className="text-sm text-slate-500">Gerencie PDVs e estagios do funil.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>PDVs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form className="flex gap-2" onSubmit={criarPdv}>
            <Input name="nome" placeholder="Nome do PDV" required />
            <Button>Adicionar</Button>
          </form>

          {pdvs.map((pdv) => (
            <div key={pdv.id} className="flex gap-2">
              <Input
                defaultValue={pdv.nome}
                onBlur={(e) => atualizarPdv(pdv.id, e.target.value)}
              />
              <Button variant="destructive" onClick={() => excluirPdv(pdv.id)}>
                Excluir
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Estagios do funil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {estagios.map((estagio) => (
            <div key={estagio.id} className="grid gap-2 md:grid-cols-4">
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
