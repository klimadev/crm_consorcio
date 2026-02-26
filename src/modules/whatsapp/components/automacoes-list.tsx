"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Zap, Send, Plus } from "lucide-react";
import type {
  WhatsappInstancia,
  WhatsappAutomacao,
  EstagioFunilOption,
  WhatsappAutomacaoCreateInput,
  WhatsappAutomacaoUpdateInput,
  WhatsappFollowUpDispatchResultado,
} from "../types";
import { AutomationFlowItem } from "./automations/automation-flow-item";
import { DispatchOverlay } from "./automations/dispatch-overlay";
import { ConfirmDeleteDialog } from "./automations/confirm-delete-dialog";
import { AutomationFormDialog } from "./automations/automation-form-dialog";

type Props = {
  automacoes: WhatsappAutomacao[];
  instancias: WhatsappInstancia[];
  carregando: boolean;
  erro: string | null;
  onCriar: (data: WhatsappAutomacaoCreateInput) => Promise<void>;
  onAtualizar: (id: string, data: WhatsappAutomacaoUpdateInput) => Promise<void>;
  onPreview: (mensagem: string) => Promise<string | null>;
  onDispararDispatch: (limite?: number) => Promise<WhatsappFollowUpDispatchResultado | null>;
  onAlternar: (id: string, ativo: boolean) => Promise<void>;
  onExcluir: (id: string) => Promise<void>;
};

export function AutomacoesList({
  automacoes,
  instancias,
  carregando,
  erro,
  onCriar,
  onAtualizar,
  onPreview,
  onDispararDispatch,
  onAlternar,
  onExcluir,
}: Props) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editAutomacao, setEditAutomacao] = useState<WhatsappAutomacao | null>(null);
  const [showDispatchResult, setShowDispatchResult] = useState(false);
  const [dispatchExecutando, setDispatchExecutando] = useState(false);
  const [dispatchResultado, setDispatchResultado] = useState<WhatsappFollowUpDispatchResultado | null>(
    null
  );
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [estagios, setEstagios] = useState<EstagioFunilOption[]>([]);

  const instanciaPorId = new Map(instancias.map((i) => [i.id, i]));

  const loadEstagios = async () => {
    const resposta = await fetch("/api/estagios");
    const json = await resposta.json().catch(() => ({}));
    if (resposta.ok) {
      setEstagios(Array.isArray(json.estagios) ? json.estagios : []);
    }
  };

  useEffect(() => {
    let ativo = true;
    const carregarEstagios = async () => {
      if (!ativo) return;
      await loadEstagios();
    };
    void carregarEstagios();
    return () => {
      ativo = false;
    };
  }, []);

  const handleCreate = async (data: unknown) => {
    await onCriar(data as WhatsappAutomacaoCreateInput);
  };

  const handleEdit = async (data: unknown) => {
    if (!editAutomacao) return;
    await onAtualizar(editAutomacao.id, data as WhatsappAutomacaoUpdateInput);
  };

  const handleEditClick = (automacao: WhatsappAutomacao) => {
    setEditAutomacao(automacao);
    setShowEditDialog(true);
  };

  const handleCloseEdit = () => {
    setEditAutomacao(null);
    setShowEditDialog(false);
  };

  const disparaDispatch = async () => {
    setDispatchExecutando(true);
    setShowDispatchResult(true);
    const resultado = await onDispararDispatch(50);
    setDispatchResultado(resultado);
    setDispatchExecutando(false);
  };

  const getNomeInstancia = (id: string) => {
    const inst = instanciaPorId.get(id);
    return inst?.nome ?? "Instância";
  };

  if (carregando) {
    return (
      <Card className="rounded-2xl border border-slate-200/60 bg-white">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border border-slate-200/60 bg-white">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
              <Zap className="h-4 w-4 text-amber-500" />
              Automações de Notificação
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-xl border-slate-200 text-sm font-medium"
                onClick={disparaDispatch}
                disabled={dispatchExecutando}
              >
                {dispatchExecutando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Processar Follow-ups
              </Button>
              <Button
                variant="default"
                size="sm"
                className="h-9 rounded-xl bg-emerald-600 text-sm font-medium hover:bg-emerald-700"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nova Automação
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {automacoes.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <Zap className="h-7 w-7 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-700">Nenhuma automação configurada</p>
          <p className="mt-1 text-xs text-slate-500">
            Configure alertas automáticos para receber notificações no WhatsApp
          </p>
          <Button
            variant="default"
            size="sm"
            className="mt-4 rounded-xl bg-emerald-600 hover:bg-emerald-700"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Criar primeira automação
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {automacoes.map((automacao) => (
          <AutomationFlowItem
            key={automacao.id}
            automacao={automacao}
            instanciaNome={getNomeInstancia(automacao.id_whatsapp_instancia)}
            onToggle={onAlternar}
            onEdit={handleEditClick}
            onRequestDelete={(id) => setDeleteConfirmId(id)}
          />
        ))}
      </div>

      <AutomationFormDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        mode="create"
        instancias={instancias}
        estagios={estagios}
        onSubmit={handleCreate}
      />

      <AutomationFormDialog
        open={showEditDialog}
        onClose={handleCloseEdit}
        mode="edit"
        automacao={editAutomacao ?? undefined}
        instancias={instancias}
        estagios={estagios}
        onSubmit={handleEdit}
      />

      <ConfirmDeleteDialog
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) {
            onExcluir(deleteConfirmId);
            setDeleteConfirmId(null);
          }
        }}
      />

      <DispatchOverlay
        open={showDispatchResult}
        resultado={dispatchResultado}
        onClose={() => setShowDispatchResult(false)}
      />
    </div>
  );
}
