"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type UseEquipeFiltrosReturn = {
  searchParams: ReturnType<typeof useSearchParams>;
  busca: string;
  idPdvFiltro: string;
  statusFiltro: string;
  cargoFiltro: string;
  ordenarPor: string;
  direcao: string;
  pagina: number;
  porPagina: number;
  atualizarParametrosUrl: (atualizacoes: Record<string, string | null>, resetarPagina?: boolean) => void;
  limparFiltros: () => void;
};

export function useEquipeFiltros(): UseEquipeFiltrosReturn {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const busca = searchParams.get("busca") ?? "";
  const idPdvFiltro = searchParams.get("id_pdv") ?? "";
  const statusFiltro = searchParams.get("status") ?? "TODOS";
  const cargoFiltro = searchParams.get("cargo") ?? "TODOS";
  const ordenarPor = searchParams.get("ordenar_por") ?? "nome";
  const direcao = searchParams.get("direcao") ?? "asc";
  const pagina = Number(searchParams.get("pagina") ?? "1");
  const porPagina = Number(searchParams.get("por_pagina") ?? "20");

  const atualizarParametrosUrl = useCallback(
    (atualizacoes: Record<string, string | null>, resetarPagina = false) => {
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
    },
    [pathname, router, searchParams],
  );

  const limparFiltros = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("busca");
    params.delete("id_pdv");
    params.delete("status");
    params.delete("cargo");
    params.delete("ordenar_por");
    params.delete("direcao");
    params.set("pagina", "1");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [pathname, router, searchParams]);

  return {
    searchParams,
    busca,
    idPdvFiltro,
    statusFiltro,
    cargoFiltro,
    ordenarPor,
    direcao,
    pagina,
    porPagina,
    atualizarParametrosUrl,
    limparFiltros,
  };
}
