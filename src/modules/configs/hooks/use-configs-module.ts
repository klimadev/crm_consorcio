"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { Pdv, Estagio, UseConfigsReturn } from "../types";

function ordenarPdvs(lista: Pdv[]) {
  return [...lista].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export function useConfigsModule(): UseConfigsReturn {
  const [pdvs, setPdvs] = useState<Pdv[]>([]);
  const [estagios, setEstagios] = useState<Estagio[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const INATIVA_POLLING_MS = 15000;

  const bootstrap = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    let ativo = true;

    const carregarInicial = async () => {
      await bootstrap();
    };

    void carregarInicial();

    pollingRef.current = setInterval(() => {
      void bootstrap();
    }, INATIVA_POLLING_MS);

    return () => {
      ativo = false;
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [bootstrap, INATIVA_POLLING_MS]);

  const criarPdv = useCallback(async (evento: React.FormEvent<HTMLFormElement>) => {
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
  }, []);

  const atualizarPdv = useCallback(async (id: string, nome: string) => {
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
  }, [pdvs]);

  const excluirPdv = useCallback(async (id: string) => {
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
  }, [pdvs]);

  const atualizarEstagio = useCallback(async (id: string, nome: string, ordem: number) => {
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
  }, [estagios]);

  return {
    pdvs,
    estagios,
    erro,
    criarPdv,
    atualizarPdv,
    excluirPdv,
    atualizarEstagio,
  };
}
