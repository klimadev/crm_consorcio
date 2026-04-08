"use client";

import { useState } from "react";
import { 
  ArrowLeft, 
  Check, 
  ChevronRight, 
  LayoutTemplate,
  Eye,
  EyeOff
} from "lucide-react";
import { ModulePageHeader } from "@/components/shared/module-page-header";
import { ModulePageShell } from "@/components/shared/module-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Produto } from "@/lib/api/produtos";
import type { UseProdutoWizardReturn, EtapaProdutoForm } from "../types";
import { useProdutoWizard } from "../hooks/use-produto-wizard";
import { ProdutoLayoutBuilder } from "./produto-layout-builder";
import { ProdutoLayoutPreview } from "./produto-layout-preview";

type ProdutoWizardPageProps = {
  produtoInicial?: Produto | null;
};

function EtapaCard({ 
  etapa, 
  indice, 
  atual, 
  onClique 
}: { 
  etapa: { id: EtapaProdutoForm; titulo: string };
  indice: number;
  atual: boolean;
  onClique: (id: EtapaProdutoForm) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClique(etapa.id)}
      className={cn(
        "w-full rounded-lg border-0 bg-transparent px-4 py-3 text-left transition-colors",
        atual && "bg-emerald-50"
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
          atual 
            ? "bg-emerald-600 text-white" 
            : "bg-slate-100 text-slate-400"
        )}>
          {indice + 1}
        </div>
        <span className={cn(
          "text-sm font-medium",
          atual ? "text-emerald-700 font-semibold" : "text-slate-600"
        )}>
          {etapa.titulo}
        </span>
      </div>
    </button>
  );
}

function EtapasNavegacao({ 
  etapas, 
  indiceAtual, 
  onIrParaEtapa 
}: { 
  etapas: Array<{ id: EtapaProdutoForm; titulo: string }>;
  indiceAtual: number;
  onIrParaEtapa: (etapa: EtapaProdutoForm) => void;
}) {
  return (
    <div className="space-y-1">
      {etapas.map((etapa, indice) => (
        <EtapaCard
          key={etapa.id}
          etapa={etapa}
          indice={indice}
          atual={indice === indiceAtual}
          onClique={onIrParaEtapa}
        />
      ))}
    </div>
  );
}

export function ModuloProdutoWizard({ produtoInicial }: ProdutoWizardPageProps) {
  const vm = useProdutoWizard(produtoInicial);
  const [mostrarPreview, setMostrarPreview] = useState(false);

  function renderizarConteudoEtapa(wizard: UseProdutoWizardReturn) {
    if (wizard.etapaAtual === "basico") {
      return (
        <Card className="border-border">
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700">Nome do Produto</label>
              <Input
                value={wizard.form.nome}
                onChange={(event) => wizard.atualizarForm({ nome: event.target.value })}
                placeholder="Ex.: Consórcio Auto Premium"
                className="h-10"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700">Descrição Interna</label>
              <Textarea
                value={wizard.form.descricao}
                onChange={(event) => wizard.atualizarForm({ descricao: event.target.value })}
                placeholder="Ex.: Use quando o lead pedir simulação com prazo, valor e observações comerciais."
                className="min-h-[100px] resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Status</label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={wizard.form.ativo ? "default" : "outline"}
                  className={cn(
                    wizard.form.ativo ? "bg-emerald-600 hover:bg-emerald-700" : ""
                  )}
                  onClick={() => wizard.atualizarForm({ ativo: true })}
                >
                  Ativo
                </Button>
                <Button
                  type="button"
                  variant={!wizard.form.ativo ? "default" : "outline"}
                  className={cn(
                    !wizard.form.ativo ? "bg-slate-600 hover:bg-slate-700" : ""
                  )}
                  onClick={() => wizard.atualizarForm({ ativo: false })}
                >
                  Rascunho
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (wizard.etapaAtual === "campos") {
      return (
        <Card className="border-border">
          <CardContent className="pt-6">
            <ProdutoLayoutBuilder
              campos={wizard.form.schemaLayout.campos}
              onAdicionarCampo={wizard.adicionarCampo}
              onAtualizarCampo={wizard.atualizarCampo}
              onRemoverCampo={wizard.removerCampo}
              onMoverCampo={wizard.moverCampo}
            />
          </CardContent>
        </Card>
      );
    }

    return (
        <Card className="border-border">
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border bg-background-surface p-4">
              <p className="text-xs font-medium text-foreground-muted">Nome</p>
              <p className="truncate text-sm font-semibold text-foreground" title={wizard.form.nome}>
                {wizard.form.nome || "—"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background-surface p-4">
              <p className="text-xs font-medium text-foreground-muted">Campos</p>
              <p className="text-lg font-semibold text-foreground">{vm.resumoFormulario.quantidadeCampos}</p>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-amber-500 text-white text-sm font-bold">
                !
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-900">Revisão necessária</p>
                <p className="mt-1 text-sm text-amber-700">
                  {!wizard.form.nome.trim() && "• Defina um nome para o produto\n"}
                  {vm.resumoFormulario.quantidadeCampos === 0 && "• Adicione pelo menos um campo"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
      <ModulePageShell spacing="lg">
      <ModulePageHeader
        title={vm.produtoEmEdicao ? "Editar Produto" : "Criar Produto"}
        icon={<LayoutTemplate className="h-6 w-6" />}
        iconTone="emerald"
        actions={
          <Button 
            type="button" 
            variant="ghost" 
            onClick={vm.voltarCatalogo} 
            className="gap-2 text-foreground-muted hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Voltar</span>
          </Button>
        }
      />

      {vm.erro && (
        <div className="mb-6 rounded-lg border border-destructive/20 bg-destructive/10 p-4">
          <p className="font-semibold text-rose-800">Erro</p>
          <p className="text-sm text-destructive">{vm.erro}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="space-y-2">
          <div className="rounded-lg border border-border bg-background-surface p-4">
            <div className="mb-3 text-xs font-medium text-foreground-muted">Etapas</div>
            <EtapasNavegacao
              etapas={vm.etapas}
              indiceAtual={vm.indiceEtapaAtual}
              onIrParaEtapa={vm.irParaEtapa}
            />
          </div>
        </div>

        <div className="space-y-4">
          {renderizarConteudoEtapa(vm)}

          <div className="flex items-center justify-between gap-4">
            <Button
              type="button"
              variant="ghost"
              onClick={vm.voltarCatalogo}
              className="gap-2 text-foreground-muted hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Cancelar</span>
            </Button>

            <div className="flex items-center gap-3">
              {vm.indiceEtapaAtual > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={vm.voltarEtapa}
                  className="gap-2 border-border"
                >
                  <ChevronRight className="h-4 w-4 rotate-180" />
                  <span className="text-sm font-medium">Voltar</span>
                </Button>
              )}

              {vm.indiceEtapaAtual < vm.etapas.length - 1 ? (
                <Button
                  type="button"
                  onClick={vm.avancarEtapa}
                  disabled={!vm.podeAvancarEtapaAtual}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                >
                  <span className="text-sm font-medium">Continuar</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => void vm.salvarProduto()}
                  disabled={vm.salvando}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                >
                  {vm.salvando ? (
                    <>
                      <span className="text-sm font-medium">Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span className="text-sm font-medium">Salvar</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setMostrarPreview(!mostrarPreview)}
              className="text-sm font-medium text-foreground-muted transition-colors hover:text-foreground"
            >
              {mostrarPreview ? (
                <span className="inline-flex items-center gap-1">
                  <EyeOff className="h-4 w-4" />
                  Ocultar preview
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  Ver preview
                </span>
              )}
            </button>
          </div>

          {mostrarPreview && (
            <div className="mt-4">
              <ProdutoLayoutPreview schemaLayout={vm.form.schemaLayout} />
            </div>
          )}
        </div>
      </div>
    </ModulePageShell>
  );
}
