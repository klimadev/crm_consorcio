"use client";

import { useEffect, useState, useCallback } from "react";
import type { WhatsappInstancia, UseWhatsappModuleReturn } from "../types";

export function useWhatsappModule(): UseWhatsappModuleReturn {
  const [instancias, setInstancias] = useState<WhatsappInstancia[]>([]);
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregarInstancias = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    try {
      const resposta = await fetch("/api/whatsapp/instances");

      if (!resposta.ok) {
        const json = await resposta.json();
        setErro(json.erro ?? "Erro ao carregar instâncias.");
        return;
      }

      const json = await resposta.json();
      setInstancias(json.instancias ?? []);
    } catch {
      setErro("Erro ao conectar com o servidor.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    let ativo = true;

    const carregar = async () => {
      await carregarInstancias();
    };

    void carregar();

    return () => {
      ativo = false;
    };
  }, [carregarInstancias]);

  const buscarQrCode = useCallback(async (id: string): Promise<string | null> => {
    try {
      const resposta = await fetch(`/api/whatsapp/instances/${id}/qrcode`, {
        method: "GET",
      });

      if (!resposta.ok) {
        return null;
      }

      const json = await resposta.json();
      if (json.qrCode) {
        setQrCodes((antigo) => ({ ...antigo, [id]: json.qrCode }));
        return json.qrCode;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const criarInstancia = useCallback(async (nome: string) => {
    setErro(null);

    const idTemporario = `temp-${Date.now()}`;
    const instanciaTemp: WhatsappInstancia = {
      id: idTemporario,
      id_empresa: "",
      id_criador: "",
      nome,
      instance_name: "",
      status: "creating",
      phone: null,
      profile_name: null,
      profile_pic: null,
      criado_em: new Date(),
      atualizado_em: new Date(),
    };

    setInstancias((atual) => [instanciaTemp, ...atual]);

    try {
      const resposta = await fetch("/api/whatsapp/instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome }),
      });

      if (!resposta.ok) {
        const json = await resposta.json();
        setErro(json.erro ?? "Erro ao criar instância.");
        setInstancias((atual) => atual.filter((i) => i.id !== idTemporario));
        return;
      }

      const json = await resposta.json();
      if (json.instancia) {
        setInstancias((atual) =>
          atual.map((i) => (i.id === idTemporario ? json.instancia : i))
        );
        if (json.qrCode) {
          setQrCodes((antigo) => ({ ...antigo, [json.instancia.id]: json.qrCode }));
        }
      }
    } catch {
      setErro("Erro ao criar instância.");
      setInstancias((atual) => atual.filter((i) => i.id !== idTemporario));
    }
  }, []);

  const excluirInstancia = useCallback(async (id: string) => {
    if (id.startsWith("temp-")) return;

    const instanciaAnterior = instancias.find((i) => i.id === id);
    if (!instanciaAnterior) return;

    setInstancias((atual) => atual.filter((i) => i.id !== id));
    setQrCodes((antigo) => {
      const { [id]: _, ...resto } = antigo;
      return resto;
    });

    try {
      const resposta = await fetch(`/api/whatsapp/instances/${id}`, {
        method: "DELETE",
      });

      if (!resposta.ok) {
        const json = await resposta.json();
        setErro(json.erro ?? "Erro ao excluir instância.");
        setInstancias((atual) => [...atual, instanciaAnterior]);
      }
    } catch {
      setErro("Erro ao excluir instância.");
      setInstancias((atual) => [...atual, instanciaAnterior]);
    }
  }, [instancias]);

  const atualizarStatus = useCallback(async (id: string) => {
    if (id.startsWith("temp-")) return;

    try {
      const resposta = await fetch(`/api/whatsapp/instances/${id}`, {
        method: "PATCH",
      });

      if (!resposta.ok) return;

      const json = await resposta.json();
      if (json.instancia) {
        setInstancias((atual) =>
          atual.map((i) => (i.id === id ? json.instancia : i))
        );
      }
    } catch {
      // Silencioso
    }
  }, []);

  useEffect(() => {
    const intervalo = setInterval(() => {
      instancias.forEach((instancia) => {
        if (!instancia.phone && !instancia.id.startsWith("temp-")) {
          atualizarStatus(instancia.id);
        }
      });
    }, 3000);

    return () => clearInterval(intervalo);
  }, [instancias, atualizarStatus]);

  const getQrCode = useCallback((id: string): string | null => {
    return qrCodes[id] ?? null;
  }, [qrCodes]);

  return {
    instancias,
    carregando,
    erro,
    criarInstancia,
    excluirInstancia,
    atualizarStatus,
    buscarQrCode,
    getQrCode,
    recarregar: carregarInstancias,
  };
}
