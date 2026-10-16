import { useState } from "react";
import { ArrowUpRight, Ban, ChevronDown, Flag, Loader2, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { normalizarTelefoneParaWhatsapp } from "@/lib/phone";
import { ROTULOS_STATUS } from "@/lib/financeiro/vocabulario";
import { obterParcelasEmAberto } from "@/lib/financeiro/parcelas";
import { cn, descreveDataRelativa, formataMoeda } from "@/lib/utils";
import { isStatusPerdido, type ClienteCarteira, type UseRecebimentosModuleReturn } from "../types";
import { RecebimentosEmptyState } from "./recebimentos-empty-state";
import { NotaCobranca } from "@/modules/parcelas/components/nota-cobranca";
import { CancelarParcelaDialog } from "@/modules/parcelas/components/cancelar-parcela-dialog";
import { EncerrarPlanoDialog } from "@/modules/parcelas/components/encerrar-plano-dialog";
import type { Parcela } from "@/lib/api/parcelas";

// Estado agregado do cliente: o que a operadora precisa decidir sobre uma pessoa.
const ESTADO_CLIENTE: Record<ClienteCarteira["estado"], { rotulo: string; tom: "error" | "success" | "info" }> = {
  em_atraso: { rotulo: "Em atraso", tom: "error" },
  em_dia: { rotulo: "Em dia", tom: "success" },
  pago_no_periodo: { rotulo: "Pago no período", tom: "info" },
};

function iniciaisDoNome(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0] ?? ""}${partes[partes.length - 1][0] ?? ""}`.toUpperCase();
}

function descreverContexto(cliente: ClienteCarteira) {
  if (cliente.estado === "em_atraso" && cliente.primeiroAtraso) {
    return `mais antiga venceu ${descreveDataRelativa(cliente.primeiroAtraso)}`;
  }
  if (cliente.estado === "em_dia" && cliente.proximoVencimento) {
    return `próxima vence ${descreveDataRelativa(cliente.proximoVencimento)}`;
  }
  if (cliente.estado === "pago_no_periodo" && cliente.ultimoPagamento) {
    return `pagou ${descreveDataRelativa(cliente.ultimoPagamento)}`;
  }
  return null;
}

type ParcelaLinhaProps = {
  parcela: Parcela;
  cliente: ClienteCarteira;
  vm: UseRecebimentosModuleReturn;
  onCancelar: (parcela: Parcela) => void;
};

function ParcelaLinha({ parcela, cliente, vm, onCancelar }: ParcelaLinhaProps) {
  const perdida = isStatusPerdido(parcela.status);
  const emAberto = parcela.status === "AGUARDANDO" || parcela.status === "ATRASADA";
  const registro = ROTULOS_STATUS[parcela.status];

  const quandoTexto = perdida
    ? [
        `saiu da cobrança ${parcela.cancelado_em ? descreveDataRelativa(parcela.cancelado_em) : ""}`.trim(),
        parcela.motivo_cancelamento ? `motivo: ${parcela.motivo_cancelamento}` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : parcela.status === "PAGA"
      ? parcela.data_pagamento
        ? `pago ${descreveDataRelativa(parcela.data_pagamento)}`
        : "pago"
      : `${parcela.status === "ATRASADA" ? "venceu" : "vence"} ${descreveDataRelativa(parcela.data_vencimento)}`;

  return (
    <div className="rounded-xl border border-border bg-muted/40 px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant={registro.tom}>{registro.rotulo}</Badge>
          <span className="text-sm font-medium text-foreground">#{parcela.numero_parcela}/{parcela.quantidade_total}</span>
        </div>
        <p className="text-sm text-foreground-muted">{quandoTexto}</p>
        <div className="flex items-center gap-3">
          <span className={cn("text-sm font-semibold text-foreground", perdida && "text-foreground-muted line-through")}>
            {formataMoeda(parcela.valor)}
          </span>
          {emAberto ? (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                className="min-h-11 rounded-lg bg-success text-success-foreground hover:bg-success/90"
                onClick={() => void vm.pagarParcela(parcela.id, cliente.id_lead)}
                disabled={vm.pagando !== null || vm.cancelandoParcela !== null}
              >
                Registrar pagamento
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="min-h-11 min-w-11 rounded-lg px-0 text-warning hover:bg-warning/10 hover:text-warning"
                onClick={() => onCancelar(parcela)}
                disabled={vm.pagando !== null || vm.cancelandoParcela !== null}
                aria-label={`Cancelar parcela ${parcela.numero_parcela}`}
              >
                {vm.cancelandoParcela === parcela.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Ban className="h-4 w-4" />
                )}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
      {emAberto ? (
        <div className="mt-2">
          <NotaCobranca
            parcela={parcela}
            podeEditar
            onSalvar={(observacao) => vm.salvarObservacao(parcela.id, cliente.id_lead, observacao)}
          />
        </div>
      ) : null}
    </div>
  );
}

type CartaoClienteProps = {
  cliente: ClienteCarteira;
  vm: UseRecebimentosModuleReturn;
};

function CartaoCliente({ cliente, vm }: CartaoClienteProps) {
  const expandido = vm.clienteExpandido === cliente.id_lead;
  const parcelas = vm.parcelasExpandidas[cliente.id_lead] ?? [];
  const whatsapp = normalizarTelefoneParaWhatsapp(cliente.telefone);
  const estado = ESTADO_CLIENTE[cliente.estado];
  const contexto = descreverContexto(cliente);
  const progresso = cliente.totalPlano > 0 ? Math.min(100, (cliente.pagasPlano / cliente.totalPlano) * 100) : 0;
  const valorDestaque = cliente.estado === "em_atraso" ? cliente.valorEmRisco : cliente.valorPendente;
  const pendencias = cliente.quantidadeAtrasadas + cliente.quantidadePendentes;

  const [encerrarAberto, setEncerrarAberto] = useState(false);
  const [parcelaParaCancelar, setParcelaParaCancelar] = useState<Parcela | null>(null);
  const emAbertoExpandidas = obterParcelasEmAberto(parcelas).length;

  return (
    <article
      className={cn(
        "rounded-2xl border bg-background-surface p-4 shadow-sm transition-colors",
        expandido ? "border-primary/50" : "border-border",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-sm font-bold text-foreground"
            aria-hidden="true"
          >
            {iniciaisDoNome(cliente.nome)}
          </span>
          <div>
            <button
              type="button"
              onClick={() => vm.alternarExpansao(cliente.id_lead)}
              aria-expanded={expandido}
              className="text-left text-base font-semibold text-foreground hover:text-primary"
            >
              {cliente.nome}
            </button>
            <p className="text-xs text-foreground-muted">
              {cliente.totalPlano > 0
                ? `plano de ${cliente.totalPlano} parcelas · ${cliente.pagasPlano} pagas`
                : "sem plano ativo"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={estado.tom}>{estado.rotulo}</Badge>
          {valorDestaque > 0 ? (
            <span className={cn("text-lg font-bold", cliente.estado === "em_atraso" ? "text-destructive" : "text-foreground")}>
              {formataMoeda(valorDestaque)}
            </span>
          ) : null}
        </div>
      </div>

      {cliente.totalPlano > 0 ? (
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 w-full max-w-56 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-success transition-all duration-500" style={{ width: `${progresso}%` }} />
          </div>
          <span className="shrink-0 text-xs text-foreground-muted">{Math.round(progresso)}% pago</span>
        </div>
      ) : null}

      <p className="mt-2 text-sm text-foreground-muted">
        {cliente.estado === "em_atraso"
          ? `${cliente.quantidadeAtrasadas} ${cliente.quantidadeAtrasadas === 1 ? "parcela vencida" : "parcelas vencidas"}${contexto ? ` · ${contexto}` : ""}`
          : contexto}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {whatsapp.valido ? (
          <Button asChild size="sm" className="min-h-11 rounded-lg bg-success text-success-foreground hover:bg-success/90">
            <a href={`https://wa.me/${whatsapp.waNumber}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-1 h-4 w-4" />
              Cobrar no WhatsApp
            </a>
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-11 rounded-lg"
          onClick={() => vm.alternarExpansao(cliente.id_lead)}
          aria-expanded={expandido}
        >
          {expandido ? "Ocultar parcelas" : `Ver parcelas${pendencias > 0 ? ` (${pendencias})` : ""}`}
          <ChevronDown className={cn("ml-1 h-4 w-4 transition-transform", expandido && "rotate-180")} />
        </Button>
        <Button asChild size="sm" variant="ghost" className="min-h-11 rounded-lg text-info hover:bg-info/10 hover:text-info">
          <a href={`/kanban?lead=${cliente.id_lead}`}>
            <ArrowUpRight className="mr-1 h-4 w-4" />
            Abrir lead
          </a>
        </Button>
      </div>

      {expandido ? (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground-muted">
              Parcelas do plano
            </p>
            {emAbertoExpandidas > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="min-h-9 rounded-lg text-warning hover:bg-warning/10 hover:text-warning"
                onClick={() => setEncerrarAberto(true)}
                disabled={vm.cancelandoParcela !== null || vm.pagando !== null}
              >
                <Flag className="mr-1 h-4 w-4" />
                Encerrar plano
              </Button>
            ) : null}
          </div>

          {vm.expandindo === cliente.id_lead ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-foreground-muted" />
            </div>
          ) : parcelas.length === 0 ? (
            <p className="py-2 text-center text-sm text-foreground-muted">Nenhuma parcela encontrada para este cliente.</p>
          ) : (
            parcelas.map((parcela) => (
              <ParcelaLinha
                key={parcela.id}
                parcela={parcela}
                cliente={cliente}
                vm={vm}
                onCancelar={setParcelaParaCancelar}
              />
            ))
          )}
        </div>
      ) : null}

      <EncerrarPlanoDialog
        aberto={encerrarAberto}
        parcelas={parcelas}
        encerrando={vm.cancelandoParcela !== null}
        erro={vm.erro}
        onOpenChange={setEncerrarAberto}
        onEncerrar={(idParcelaParada, motivo) => vm.encerrarPlano(idParcelaParada, cliente.id_lead, motivo)}
      />

      <CancelarParcelaDialog
        aberto={parcelaParaCancelar !== null}
        parcela={parcelaParaCancelar}
        parcelasDoLead={parcelas}
        cancelando={parcelaParaCancelar !== null && vm.cancelandoParcela === parcelaParaCancelar.id}
        erro={vm.erro}
        onOpenChange={(aberto) => !aberto && setParcelaParaCancelar(null)}
        onConfirmar={async (modo, motivo) => {
          if (!parcelaParaCancelar) return false;
          return vm.cancelarParcela(parcelaParaCancelar.id, cliente.id_lead, modo, motivo);
        }}
      />
    </article>
  );
}

export function CarteiraLista({ vm }: { vm: UseRecebimentosModuleReturn }) {
  if (vm.carregando) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((indice) => (
          <div key={indice} className="h-32 rounded-2xl border border-border bg-background-elevated animate-shimmer" />
        ))}
      </div>
    );
  }

  if (vm.carteiraFiltrada.length === 0) {
    return <RecebimentosEmptyState chip={vm.chip} />;
  }

  return (
    <div className="space-y-3">
      {vm.carteiraFiltrada.map((cliente) => (
        <CartaoCliente key={cliente.id_lead} cliente={cliente} vm={vm} />
      ))}
    </div>
  );
}
