"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, MessageCircle, PartyPopper, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizarTelefoneParaWhatsapp } from "@/lib/phone";
import { descreveDataRelativa, formataMoeda } from "@/lib/utils";
import { NotaCobranca } from "@/modules/parcelas/components/nota-cobranca";
import { EncerrarPlanoDialog } from "@/modules/parcelas/components/encerrar-plano-dialog";
import type { ClienteCarteira, UseRecebimentosModuleReturn } from "../types";

type ModoFocoProps = {
  vm: UseRecebimentosModuleReturn;
  onFechar: () => void;
};

// Fila de cobrança um cliente por vez: a pessoa decide sobre uma pessoa de
// cada vez, sem a lista inteira ao fundo. Abre no "Iniciar cobranças" do hero.
export function ModoFoco({ vm, onFechar }: ModoFocoProps) {
  const { carregarParcelasCliente, parcelasExpandidas, expandindo, pagando, cancelandoParcela, salvarObservacao, pagarParcela, encerrarPlano } = vm;

  // Snapshot da fila na abertura: pagamentos no meio não reordenam a fila
  // debaixo de quem está cobrando.
  const [fila] = useState<ClienteCarteira[]>(() =>
    vm.carteira.filter((cliente) => cliente.estado === "em_atraso"),
  );
  const [indice, setIndice] = useState(0);
  const [encerrarAberto, setEncerrarAberto] = useState(false);
  const cliente = fila[indice] as ClienteCarteira | undefined;

  const idLeadAtual = cliente?.id_lead;

  useEffect(() => {
    if (idLeadAtual) void carregarParcelasCliente(idLeadAtual);
  }, [idLeadAtual, carregarParcelasCliente]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onFechar();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onFechar]);

  useEffect(() => {
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflowAnterior;
    };
  }, []);

  const parcelas = cliente ? parcelasExpandidas[cliente.id_lead] ?? [] : [];
  const atrasadas = parcelas.filter((parcela) => parcela.status === "ATRASADA");
  const primeiraAtrasada = atrasadas[0];
  const whatsapp = cliente ? normalizarTelefoneParaWhatsapp(cliente.telefone) : null;
  const ocupado = pagando !== null || cancelandoParcela !== null;
  const tudoResolvido = Boolean(cliente) && !primeiraAtrasada && expandindo !== idLeadAtual;

  return (
    <dialog
      open
      className="fixed inset-0 z-[60] m-0 h-full w-full max-w-none overflow-y-auto bg-[color:var(--overlay)] p-4 backdrop-blur-sm"
      aria-label="Modo foco de cobrança"
    >
      <div className="mx-auto my-8 w-full max-w-xl rounded-2xl border border-border bg-background-surface p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-foreground-muted">
            Cliente {Math.min(indice + 1, fila.length)} de {fila.length}
          </p>
          <button
            type="button"
            onClick={onFechar}
            className="rounded-lg p-1 text-foreground-muted transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Sair do modo foco"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${(Math.min(indice, fila.length) / Math.max(fila.length, 1)) * 100}%` }}
          />
        </div>

        {cliente ? (
          <div className="mt-6">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">{cliente.nome}</h2>
            <p className="mt-1 text-lg font-semibold text-destructive">
              {formataMoeda(cliente.valorEmRisco)}
              <span className="text-sm font-normal text-foreground-muted">
                {" "}
                em {cliente.quantidadeAtrasadas}{" "}
                {cliente.quantidadeAtrasadas === 1 ? "parcela vencida" : "parcelas vencidas"}
                {cliente.primeiroAtraso ? ` · mais antiga venceu ${descreveDataRelativa(cliente.primeiroAtraso)}` : ""}
              </span>
            </p>

            {expandindo === cliente.id_lead ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-foreground-muted" />
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {atrasadas.length > 0 ? (
                  <>
                    <div className="space-y-1.5">
                      {atrasadas.map((parcela) => (
                        <p key={parcela.id} className="text-sm text-foreground-muted">
                          #{parcela.numero_parcela} · venceu {descreveDataRelativa(parcela.data_vencimento)} ·{" "}
                          {formataMoeda(parcela.valor)}
                        </p>
                      ))}
                    </div>
                    {primeiraAtrasada ? (
                      <NotaCobranca
                        parcela={primeiraAtrasada}
                        podeEditar
                        onSalvar={(observacao) => salvarObservacao(primeiraAtrasada.id, cliente.id_lead, observacao)}
                      />
                    ) : null}
                  </>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl border border-success/25 bg-success/10 px-4 py-3 text-sm text-foreground">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                    Tudo resolvido com {cliente.nome} por agora.
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2">
              {tudoResolvido ? (
                <Button type="button" className="min-h-11 rounded-xl" onClick={() => setIndice((atual) => atual + 1)}>
                  Próximo cliente
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <>
                  {whatsapp?.valido ? (
                    <Button asChild className="min-h-11 rounded-xl bg-success text-success-foreground hover:bg-success/90">
                      <a href={`https://wa.me/${whatsapp.waNumber}`} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Cobrar no WhatsApp
                      </a>
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 rounded-xl"
                    onClick={() => {
                      if (primeiraAtrasada) void pagarParcela(primeiraAtrasada.id, cliente.id_lead);
                    }}
                    disabled={!primeiraAtrasada || ocupado}
                  >
                    {pagando !== null ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {primeiraAtrasada
                      ? `Registrar pagamento de ${formataMoeda(primeiraAtrasada.valor)}`
                      : "Registrar pagamento"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-11 rounded-xl text-foreground-muted"
                    onClick={() => setIndice((atual) => atual + 1)}
                    disabled={ocupado}
                  >
                    Depois
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  {primeiraAtrasada ? (
                    <button
                      type="button"
                      onClick={() => setEncerrarAberto(true)}
                      disabled={ocupado}
                      className="pt-1 text-center text-xs text-foreground-disabled underline underline-offset-2 transition-colors hover:text-warning"
                    >
                      Cliente desistiu? Encerrar o plano
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center py-8 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
              <PartyPopper className="h-8 w-8 text-success" />
            </span>
            <h2 className="mt-4 text-xl font-bold text-foreground">Cobranças de hoje concluídas.</h2>
            <p className="mt-1 text-sm text-foreground-muted">
              {fila.length > 0
                ? `Você passou por ${fila.length} ${fila.length === 1 ? "cliente" : "clientes"} da fila.`
                : "Nenhum cliente em atraso na carteira. Bom trabalho."}
            </p>
            <Button type="button" className="mt-6 min-h-11 rounded-xl" onClick={onFechar}>
              Voltar para a carteira
            </Button>
          </div>
        )}
      </div>

      {cliente ? (
        <EncerrarPlanoDialog
          aberto={encerrarAberto}
          parcelas={parcelas}
          encerrando={cancelandoParcela !== null}
          erro={vm.erro}
          onOpenChange={setEncerrarAberto}
          onEncerrar={(idParcelaParada, motivo) => encerrarPlano(idParcelaParada, cliente.id_lead, motivo)}
        />
      ) : null}
    </dialog>
  );
}
