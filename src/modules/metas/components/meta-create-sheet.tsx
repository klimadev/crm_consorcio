"use client";

import { useMemo, useState } from "react";
import { CalendarDays, FileText, Loader2, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InlineStatusAlert } from "@/components/shared/inline-status-alert";
import { formataMoeda } from "@/lib/utils";
import { calcularDatasSemana, obterMesReferencia } from "@/modules/metas/lib/dates";
import type { Meta, MetaFormData } from "@/modules/metas/types";

type Props = {
  aberto: boolean;
  onClose: () => void;
  onCreate: (dados: MetaFormData) => Promise<boolean>;
  onUpdate: (id: string, dados: Partial<MetaFormData>) => Promise<boolean>;
  opcoesEquipes: Array<{ id: string; nome: string }>;
  equipePadrao: string | null;
  metaEmEdicao: Meta | null;
  salvando: boolean;
  erro: string | null;
};

const TIPOS_META = [
  { value: "VALOR", label: "Valor", origem: "PAGAMENTOS" },
  { value: "VALOR", label: "Valor fechado", origem: "FECHADOS" },
  { value: "VOLUME", label: "Volume fechado", origem: "FECHADOS" },
] as const;

export function MetaCreateSheet({
  aberto,
  onClose,
  onCreate,
  onUpdate,
  opcoesEquipes,
  equipePadrao,
  metaEmEdicao,
  salvando,
  erro,
}: Props) {
  const [passo, setPasso] = useState<1 | 2>(1);
  const isEdicao = !!metaEmEdicao;

  const [idEquipe, setIdEquipe] = useState(metaEmEdicao?.id_equipe ?? equipePadrao ?? "");
  const [titulo, setTitulo] = useState(metaEmEdicao?.titulo ?? "");
  const [tipoMeta, setTipoMeta] = useState<"VALOR" | "VOLUME">(metaEmEdicao?.tipo_meta ?? "VALOR");
  const [origem, setOrigem] = useState<"PAGAMENTOS" | "FECHADOS">(metaEmEdicao?.origem ?? "PAGAMENTOS");
  const [alvo, setAlvo] = useState(metaEmEdicao ? String(metaEmEdicao.alvo) : "");
  const [semana, setSemana] = useState<number | null>(metaEmEdicao?.semana ?? null);
  const [mesReferencia, setMesReferencia] = useState(metaEmEdicao?.mes_referencia ?? obterMesReferencia(new Date()));

  const [erroLocal, setErroLocal] = useState<string | null>(null);

  // Reseta estado ao abrir
  const reset = () => {
    if (!isEdicao) {
      setIdEquipe(equipePadrao ?? "");
      setTitulo("");
      setTipoMeta("VALOR");
      setOrigem("PAGAMENTOS");
      setAlvo("");
      setSemana(null);
      setMesReferencia(obterMesReferencia(new Date()));
    }
    setPasso(1);
    setErroLocal(null);
  };

  const nomeEquipe = opcoesEquipes.find((e) => e.id === idEquipe)?.nome ?? "equipe selecionada";
  const alvoNumero = Number(alvo.replace(/\D/g, "")) || 0;

  // Calcula datas para preview
  const datasPreview = useMemo(() => {
    if (!semana || !mesReferencia) return null;
    return calcularDatasSemana(semana, mesReferencia);
  }, [semana, mesReferencia]);

  // Semanas disponíveis: 1-4
  const semanasDisponiveis = [1, 2, 3, 4];

  const tipoLabel = tipoMeta === "VALOR"
    ? origem === "PAGAMENTOS" ? "Valor recebido" : "Valor fechado"
    : "Contratos fechados";

  const formatDate = (d: Date) =>
    d.toLocaleDateString("pt-BR", { timeZone: "UTC", day: "numeric", month: "long" });

  const podeAvancarPasso2 = Boolean(idEquipe && alvoNumero > 0 && semana);
  const podeConfirmar = podeAvancarPasso2;

  const handleAvancar = () => {
    if (!podeAvancarPasso2) return;
    setPasso(2);
  };

  const handleConfirmar = async () => {
    if (!semana || !idEquipe || alvoNumero <= 0) return;

    const dados: MetaFormData = {
      id_equipe: idEquipe,
      tipo_meta: tipoMeta,
      origem,
      alvo: alvoNumero,
      semana,
      mes_referencia: mesReferencia,
      titulo: titulo.trim() || undefined,
    };

    setErroLocal(null);

    if (isEdicao && metaEmEdicao) {
      const ok = await onUpdate(metaEmEdicao.id, dados);
      if (ok) {
        reset();
        onClose();
      }
    } else {
      const ok = await onCreate(dados);
      if (ok) {
        reset();
        onClose();
      }
    }
  };

  const handleVoltar = () => setPasso(1);

  const handleClose = () => {
    reset();
    onClose();
  };

  const mensagemErro = erro ?? erroLocal;

  return (
    <Sheet open={aberto} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{isEdicao ? "Editar meta" : "Nova meta"}</SheetTitle>
          <SheetDescription>
            {passo === 1 ? "Passo 1: equipe, tipo e alvo" : "Passo 2: confirme os dados"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto p-4">
          {/* Indicador de passo */}
          <div className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                passo >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-foreground-muted"
              }`}
            >
              1
            </div>
            <div className="h-px flex-1 bg-border" />
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                passo >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-foreground-muted"
              }`}
            >
              2
            </div>
          </div>

          {mensagemErro && (
            <InlineStatusAlert variant="error" message={mensagemErro} />
          )}

          {passo === 1 && (
            <div className="space-y-4">
              {/* Equipe */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Equipe</label>
                <Select
                  value={idEquipe}
                  onValueChange={setIdEquipe}
                  disabled={isEdicao}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a equipe" />
                  </SelectTrigger>
                  <SelectContent>
                    {opcoesEquipes.map((eq) => (
                      <SelectItem key={eq.id} value={eq.id}>
                        {eq.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Título (opcional) — ajuda a diferenciar múltiplas metas na mesma semana */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Título <span className="text-foreground-muted font-normal">(opcional)</span>
                </label>
                <Input
                  type="text"
                  placeholder="Ex: Meta de faturamento"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                />
                <p className="text-xs text-foreground-muted">
                  Um nome curto para identificar esta meta entre outras da mesma semana.
                </p>
              </div>

              {/* Tipo de meta */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Tipo de medição</label>
                <Select
                  value={`${tipoMeta}_${origem}`}
                  onValueChange={(val) => {
                    const [tm, or] = val.split("_") as ["VALOR" | "VOLUME", "PAGAMENTOS" | "FECHADOS"];
                    setTipoMeta(tm);
                    setOrigem(or);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VALOR_PAGAMENTOS">Valor recebido</SelectItem>
                    <SelectItem value="VALOR_FECHADOS">Valor fechado</SelectItem>
                    <SelectItem value="VOLUME_FECHADOS">Contratos fechados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Semana */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Semana do mês</label>
                <Select
                  value={semana ? String(semana) : ""}
                  onValueChange={(v) => setSemana(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a semana" />
                  </SelectTrigger>
                  <SelectContent>
                    {semanasDisponiveis.map((s) => (
                      <SelectItem key={s} value={String(s)}>
                        Semana {s} ({formatDate(calcularDatasSemana(s, mesReferencia).data_inicio)} — {formatDate(calcularDatasSemana(s, mesReferencia).data_fim)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Alvo */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {tipoMeta === "VOLUME" ? "Quantidade de contratos" : "Valor alvo"}
                </label>
                <div className="relative">
                  {tipoMeta === "VALOR" && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted">R$</span>
                  )}
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder={tipoMeta === "VOLUME" ? "Ex: 10" : "Ex: 25000"}
                    value={alvo}
                    onChange={(e) => setAlvo(e.target.value)}
                    className={tipoMeta === "VALOR" ? "pl-10" : ""}
                  />
                </div>
              </div>
            </div>
          )}

          {passo === 2 && (
            <div className="space-y-6">
              {/* Preview */}
              <div className="rounded-[24px] border border-border bg-muted p-4">
                <div className="rounded-[24px] border border-border bg-background-surface p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.14em] text-foreground-muted">
                    Resumo
                  </p>
                  <div className="mt-3 space-y-3 text-sm text-foreground">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-success" />
                      {nomeEquipe}
                    </div>
                    {titulo.trim() && (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-info" />
                        {titulo.trim()}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-success" />
                      {tipoLabel}
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-success" />
                      {tipoMeta === "VOLUME" ? `${alvoNumero} contratos` : formataMoeda(alvoNumero)}
                    </div>
                    {datasPreview && (
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-success" />
                        {formatDate(datasPreview.data_inicio)} a {formatDate(datasPreview.data_fim)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {semana && mesReferencia && (
                <p className="text-sm text-foreground-muted">
                  {nomeEquipe} precisa{" "}
                  {tipoMeta === "VOLUME" ? `fechar ${alvoNumero} contratos` : `receber ${formataMoeda(alvoNumero)}`}{" "}
                  na Semana {semana} ({mesReferencia}).
                </p>
              )}
            </div>
          )}
        </div>

        <SheetFooter className="border-t border-border p-4">
          {passo === 1 ? (
            <div className="flex w-full gap-2">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Cancelar
              </Button>
              <Button className="flex-1" disabled={!podeAvancarPasso2} onClick={handleAvancar}>
                Avançar
              </Button>
            </div>
          ) : (
            <div className="flex w-full gap-2">
              <Button variant="outline" className="flex-1" onClick={handleVoltar}>
                Voltar
              </Button>
              <Button className="flex-1" disabled={!podeConfirmar || salvando} onClick={handleConfirmar}>
                {salvando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : isEdicao ? (
                  "Salvar"
                ) : (
                  "Criar meta"
                )}
              </Button>
            </div>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
