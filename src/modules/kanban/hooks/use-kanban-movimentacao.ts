import { useCallback, useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { DropResult } from "@hello-pangea/dnd";
import type { Estagio, Lead } from "../types";
import { moverLeadKanban } from "@/lib/api/kanban";

type UseKanbanMovimentacaoParams = {
  leads: Lead[];
  estagios: Estagio[];
  setLeads: Dispatch<SetStateAction<Lead[]>>;
  registrarMovimentoLocal: () => void;
  addToast: (params: {
    type: "success" | "error" | "warning";
    title: string;
    description?: string;
  }) => void;
};

export function useKanbanMovimentacao({
  leads,
  estagios,
  setLeads,
  registrarMovimentoLocal,
  addToast,
}: UseKanbanMovimentacaoParams) {
  const [movimentoPendente, setMovimentoPendente] = useState<{
    id_lead: string;
    id_estagio: string;
  } | null>(null);
  const [motivoPerda, setMotivoPerda] = useState("");

  const moverLead = useCallback(
    async (idLead: string, idEstagio: string, motivo?: string) => {
      const leadAnterior = leads.find((item) => item.id === idLead);
      if (!leadAnterior) return false;

      setLeads((atual) =>
        atual.map((item) =>
          item.id === idLead
            ? {
                ...item,
                id_estagio: idEstagio,
                motivo_perda: motivo?.trim() ? motivo.trim() : null,
              }
            : item,
        ),
      );
      registrarMovimentoLocal();

      const resposta = await moverLeadKanban(idLead, {
        id_estagio: idEstagio,
        motivo_perda: motivo,
      });

      if (!resposta.ok) {
        setLeads((atual) => atual.map((item) => (item.id === idLead ? leadAnterior : item)));
        addToast({
          type: "error",
          title: "Movimentação não permitida",
          description: resposta.erro,
        });
        return false;
      }

      if (resposta.dados.lead) {
        const leadAtualizado = resposta.dados.lead;
        setLeads((atual) => atual.map((item) => (item.id === idLead ? leadAtualizado : item)));
      }

      if (resposta.dados.mensagem) {
        addToast({
          type: "warning",
          title: "Lead com pendência de análise",
          description: resposta.dados.mensagem,
        });
      }

      return true;
    },
    [leads, setLeads, registrarMovimentoLocal, addToast],
  );

  const aoDragEnd = useCallback(
    async (resultado: DropResult) => {
      if (!resultado.destination) return;

      const idLead = resultado.draggableId;
      const idEstagioDestino = resultado.destination.droppableId;

      const lead = leads.find((item) => item.id === idLead);
      if (!lead || lead.id_estagio === idEstagioDestino) return;

      const estagioDestino = estagios.find((item) => item.id === idEstagioDestino);
      if (!estagioDestino) return;

      if (estagioDestino.tipo === "PERDIDO") {
        setMovimentoPendente({ id_lead: idLead, id_estagio: idEstagioDestino });
        return;
      }

      await moverLead(idLead, idEstagioDestino);
    },
    [leads, estagios, moverLead],
  );

  const confirmarPerda = useCallback(
    async (evento: FormEvent<HTMLFormElement>) => {
      evento.preventDefault();
      if (!movimentoPendente || !motivoPerda.trim()) return;

      const sucesso = await moverLead(
        movimentoPendente.id_lead,
        movimentoPendente.id_estagio,
        motivoPerda.trim(),
      );
      if (!sucesso) return;

      setMovimentoPendente(null);
      setMotivoPerda("");
    },
    [movimentoPendente, motivoPerda, moverLead],
  );

  return {
    movimentoPendente,
    setMovimentoPendente,
    motivoPerda,
    setMotivoPerda,
    moverLead,
    aoDragEnd,
    confirmarPerda,
  };
}
