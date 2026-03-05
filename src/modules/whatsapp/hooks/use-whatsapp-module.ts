"use client";

import { useEffect, useState, useCallback } from "react";
import {
  atualizarStatusInstanciaWhatsapp,
  criarInstanciaWhatsapp,
  excluirInstanciaWhatsapp,
  listarInstanciasWhatsapp,
  obterQrCodeWhatsapp,
} from "@/lib/api/whatsapp";
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
      const resultado = await listarInstanciasWhatsapp();

      if (!resultado.ok) {
        setErro(resultado.erro);
        return;
      }

      setInstancias(resultado.dados.instancias);
    } catch {
      setErro("Erro ao conectar com o servidor.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    const carregar = async () => {
      await carregarInstancias();
    };

    void carregar();
  }, [carregarInstancias]);

  const buscarQrCode = useCallback(async (id: string): Promise<string | null> => {
    try {
      const resultado = await obterQrCodeWhatsapp(id);
      if (!resultado.ok || !resultado.dados.qrCode) {
        return null;
      }
      const qrCode = resultado.dados.qrCode;
      setQrCodes((antigo) => ({ ...antigo, [id]: qrCode }));
      return qrCode;
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
      latency_ms: null,
      last_seen_at: null,
      connection_quality: "unknown",
      data_source: "unavailable",
    };

    setInstancias((atual) => [instanciaTemp, ...atual]);

    try {
      const resultado = await criarInstanciaWhatsapp(nome);

      if (!resultado.ok) {
        setErro(resultado.erro);
        setInstancias((atual) => atual.filter((i) => i.id !== idTemporario));
        return;
      }

      if (resultado.dados.instancia) {
        const instanciaCriada = resultado.dados.instancia;
        setInstancias((atual) => atual.map((i) => (i.id === idTemporario ? instanciaCriada : i)));
        if (resultado.dados.qrCode) {
          const qrCode = resultado.dados.qrCode;
          setQrCodes((antigo) => ({ ...antigo, [instanciaCriada.id]: qrCode }));
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
      const resto = { ...antigo };
      delete resto[id];
      return resto;
    });

    try {
      const resultado = await excluirInstanciaWhatsapp(id);

      if (!resultado.ok) {
        setErro(resultado.erro);
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
      const resultado = await atualizarStatusInstanciaWhatsapp(id);

      if (!resultado.ok || !resultado.dados.instancia) return;

      const instanciaAtualizada = resultado.dados.instancia;
      setInstancias((atual) => atual.map((i) => (i.id === id ? instanciaAtualizada : i)));
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
