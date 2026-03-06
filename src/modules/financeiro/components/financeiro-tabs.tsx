"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TabFinanceiro } from "@/lib/api/parcelas";
import type { ParcelaComLead } from "@/lib/api/parcelas";
import { ParcelaListItem } from "./parcela-list-item";

type FinanceiroTabsProps = {
  tabAtiva: TabFinanceiro;
  setTabAtiva: (tab: TabFinanceiro) => void;
  parcelas: ParcelaComLead[];
  loading: boolean;
  error: string | null;
  pagarParcela: (idParcela: string, dataPagamento?: string) => Promise<void>;
  pagando: string | null;
  contadores: {
    proximos: number | null;
    atrasados: number | null;
    recebidos: number | null;
  };
};

function ListaParcelas({
  parcelas,
  loading,
  pagarParcela,
  pagando,
}: {
  parcelas: ParcelaComLead[];
  loading: boolean;
  pagarParcela: (idParcela: string, dataPagamento?: string) => Promise<void>;
  pagando: string | null;
}) {
  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-slate-200 bg-white">
        <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!parcelas.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        Nenhuma parcela encontrada nesta aba.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {parcelas.map((parcela) => (
        <ParcelaListItem
          key={parcela.id}
          parcela={parcela}
          onPagar={(id, dataPagamento) => {
            void pagarParcela(id, dataPagamento);
          }}
          pagando={pagando === parcela.id}
        />
      ))}
    </div>
  );
}

export function FinanceiroTabs(props: FinanceiroTabsProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <Tabs value={props.tabAtiva} onValueChange={(tab) => props.setTabAtiva(tab as TabFinanceiro)}>
        <TabsList className="grid w-full grid-cols-3 bg-slate-100">
          <TabsTrigger value="proximos">Proximos ({props.contadores.proximos ?? "-"})</TabsTrigger>
          <TabsTrigger value="atrasados" className="text-rose-600">
            Atrasadas ({props.contadores.atrasados ?? "-"})
          </TabsTrigger>
          <TabsTrigger value="recebidos" className="text-emerald-600">
            Recebidas ({props.contadores.recebidos ?? "-"})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="proximos" className="mt-4">
          <ListaParcelas {...props} />
        </TabsContent>
        <TabsContent value="atrasados" className="mt-4">
          <ListaParcelas {...props} />
        </TabsContent>
        <TabsContent value="recebidos" className="mt-4">
          <ListaParcelas {...props} />
        </TabsContent>
      </Tabs>

      {props.error ? (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <p className="flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4" />
            {props.error}
          </p>
        </div>
      ) : null}
    </div>
  );
}
