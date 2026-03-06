import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "./confirm-dialog";
import { interpolarMensagemKanban, MENSAGENS_KANBAN } from "../utils/mensagens";

type LeadDeleteConfirmDialogProps = {
  aberto: boolean;
  nomeLead: string;
  excluindo: boolean;
  erro: string | null;
  onCancelar: () => void;
  onConfirmar: () => Promise<void>;
};

export function LeadDeleteConfirmDialog({ aberto, nomeLead, excluindo, erro, onCancelar, onConfirmar }: LeadDeleteConfirmDialogProps) {
  const nomeExibicao = nomeLead || MENSAGENS_KANBAN.placeholders.nomeLead;

  return (
    <ConfirmDialog
      aberto={aberto}
      titulo={MENSAGENS_KANBAN.confirmacao.excluirLeadTitulo}
      descricao={<p>{interpolarMensagemKanban(MENSAGENS_KANBAN.confirmacao.excluirLeadDescricao, { nomeLead: nomeExibicao })}</p>}
      erro={erro}
      confirmando={excluindo}
      textoCancel={MENSAGENS_KANBAN.confirmacao.cancelar}
      textoConfirmar={MENSAGENS_KANBAN.confirmacao.excluir}
      textoConfirmando={MENSAGENS_KANBAN.loading.excluindo}
      onCancelar={onCancelar}
      onConfirmar={onConfirmar}
      modo="destrutivo"
      icone={<Trash2 className="h-6 w-6" />}
    />
  );
}
