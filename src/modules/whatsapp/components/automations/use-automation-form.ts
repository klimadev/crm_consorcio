"use client";

import { useState, useCallback, useMemo } from "react";
import type {
  WhatsappAutomacao,
  WhatsappAutomacaoCreateInput,
  WhatsappAutomacaoUpdateInput,
  EstagioFunilOption,
} from "../../types";

export type FormMode = "create" | "edit";

export type EtapaForm = {
  ordem: number;
  delay_horas: number;
  delay_minutos: number;
  delay_texto: string;
  mensagem_template: string;
};

export type FormState = {
  instanciaId: string;
  evento: "LEAD_STAGE_CHANGED" | "LEAD_FOLLOW_UP";
  tipoDestino: "FIXO" | "LEAD_TELEFONE";
  idEstagioDestino: string;
  telefone: string;
  mensagemPrincipal: string;
  etapas: EtapaForm[];
};

export type UseAutomationFormReturn = {
  formState: FormState;
  formErro: string | null;
  previewServidor: string | null;
  isValid: boolean;
  validate: () => string | null;
  setFormErro: (erro: string | null) => void;
  setPreviewServidor: (preview: string | null) => void;
  setInstanciaId: (id: string) => void;
  setEvento: (evento: "LEAD_STAGE_CHANGED" | "LEAD_FOLLOW_UP") => void;
  setTipoDestino: (tipo: "FIXO" | "LEAD_TELEFONE") => void;
  setIdEstagioDestino: (id: string) => void;
  setTelefone: (telefone: string) => void;
  setMensagemPrincipal: (mensagem: string) => void;
  limparFeedback: () => void;
  adicionarEtapa: () => void;
  atualizarEtapa: (index: number, dados: Partial<EtapaForm>) => void;
  removerEtapa: (index: number) => void;
  getPayload: () => WhatsappAutomacaoCreateInput | WhatsappAutomacaoUpdateInput;
  loadFromAutomacao: (automacao: WhatsappAutomacao) => void;
  resetForm: () => void;
};

const createEmptyFormState = (): FormState => ({
  instanciaId: "",
  evento: "LEAD_STAGE_CHANGED",
  tipoDestino: "LEAD_TELEFONE",
  idEstagioDestino: "",
  telefone: "",
  mensagemPrincipal: "",
  etapas: [
    {
      ordem: 1,
      delay_horas: 1,
      delay_minutos: 0,
      delay_texto: "1h",
      mensagem_template: "",
    },
  ],
});

function delayToTexto(horas: number, minutos: number): string {
  if (horas === 0) return minutos === 1 ? "1m" : `${minutos}min`;
  if (minutos === 0) return horas === 1 ? "1h" : `${horas}h`;
  return `${horas}h${minutos}`;
}

export function useAutomationForm(
  mode: FormMode,
  estagios: EstagioFunilOption[]
): UseAutomationFormReturn {
  const [formState, setFormState] = useState<FormState>(createEmptyFormState);
  const [formErro, setFormErro] = useState<string | null>(null);
  const [previewServidor, setPreviewServidor] = useState<string | null>(null);

  const contextoPreview = useMemo(
    () => ({
      lead_nome: "João Silva",
      lead_telefone: "+5511999999999",
      lead_id: "12345",
      estagio_anterior: "Novo",
      estagio_novo: estagios.find((e) => e.id === formState.idEstagioDestino)?.nome ?? "FollowUp",
    }),
    [estagios, formState.idEstagioDestino]
  );

  const limparFeedback = useCallback(() => {
    setPreviewServidor(null);
    setFormErro(null);
  }, []);

  const setInstanciaId = useCallback((id: string) => {
    limparFeedback();
    setFormState((prev) => ({ ...prev, instanciaId: id }));
  }, [limparFeedback]);

  const setEvento = useCallback(
    (evento: "LEAD_STAGE_CHANGED" | "LEAD_FOLLOW_UP") => {
      limparFeedback();
      setFormState((prev) => ({ ...prev, evento }));
    },
    [limparFeedback]
  );

  const setTipoDestino = useCallback((tipoDestino: "FIXO" | "LEAD_TELEFONE") => {
    limparFeedback();
    setFormState((prev) => ({ ...prev, tipoDestino }));
  }, [limparFeedback]);

  const setIdEstagioDestino = useCallback((idEstagioDestino: string) => {
    limparFeedback();
    setFormState((prev) => ({ ...prev, idEstagioDestino }));
  }, [limparFeedback]);

  const setTelefone = useCallback((telefone: string) => {
    limparFeedback();
    setFormState((prev) => ({ ...prev, telefone }));
  }, [limparFeedback]);

  const setMensagemPrincipal = useCallback((mensagemPrincipal: string) => {
    limparFeedback();
    setFormState((prev) => ({ ...prev, mensagemPrincipal }));
  }, [limparFeedback]);

  const adicionarEtapa = useCallback(() => {
    limparFeedback();
    setFormState((prev) => ({
      ...prev,
      etapas: [
        ...prev.etapas,
        {
          ordem: prev.etapas.length + 1,
          delay_horas: 1,
          delay_minutos: 0,
          delay_texto: "1h",
          mensagem_template: "",
        },
      ],
    }));
  }, [limparFeedback]);

  const atualizarEtapa = useCallback(
    (index: number, dados: Partial<EtapaForm>) => {
      limparFeedback();
      setFormState((prev) => ({
        ...prev,
        etapas: prev.etapas.map((item, i) =>
          i === index ? { ...item, ...dados } : item
        ),
      }));
    },
    [limparFeedback]
  );

  const removerEtapa = useCallback(
    (index: number) => {
      limparFeedback();
      setFormState((prev) => {
        if (prev.etapas.length <= 1) return prev;
        return {
          ...prev,
          etapas: prev.etapas
            .filter((_, i) => i !== index)
            .map((item, i) => ({ ...item, ordem: i + 1 })),
        };
      });
    },
    [limparFeedback]
  );

  const getPayload = useCallback((): WhatsappAutomacaoCreateInput | WhatsappAutomacaoUpdateInput => {
    const { instanciaId, evento, tipoDestino, idEstagioDestino, telefone, mensagemPrincipal, etapas } =
      formState;

    const base = {
      id_whatsapp_instancia: instanciaId,
      evento,
      tipo_destino: tipoDestino,
      id_estagio_destino: idEstagioDestino || (mode === "edit" ? null : undefined),
      telefone_destino: tipoDestino === "FIXO" ? telefone : undefined,
      mensagem: evento === "LEAD_STAGE_CHANGED" ? mensagemPrincipal : undefined,
    };

    if (evento === "LEAD_FOLLOW_UP") {
      if (mode === "edit") {
        return {
          ...base,
          id_estagio_destino: idEstagioDestino || null,
          telefone_destino: tipoDestino === "FIXO" ? telefone : null,
          etapas: etapas.map((etapa, index) => ({
            ordem: index + 1,
            delay_minutos: Math.max(1, etapa.delay_horas * 60 + etapa.delay_minutos),
            mensagem_template: etapa.mensagem_template,
          })),
        } as WhatsappAutomacaoUpdateInput;
      }
      return {
        ...base,
        etapas: etapas.map((etapa, index) => ({
          ordem: index + 1,
          delay_minutos: Math.max(1, etapa.delay_horas * 60 + etapa.delay_minutos),
          mensagem_template: etapa.mensagem_template,
        })),
      } as WhatsappAutomacaoCreateInput;
    }

    return base as WhatsappAutomacaoUpdateInput;
  }, [formState, mode]);

  const loadFromAutomacao = useCallback((automacao: WhatsappAutomacao) => {
    setFormState({
      instanciaId: automacao.id_whatsapp_instancia,
      evento: automacao.evento,
      tipoDestino: automacao.tipo_destino,
      idEstagioDestino: automacao.id_estagio_destino || "",
      telefone: automacao.telefone_destino || "",
      mensagemPrincipal: automacao.mensagem || "",
      etapas:
        automacao.etapas && automacao.etapas.length > 0
          ? automacao.etapas.map((etapa) => ({
              ordem: etapa.ordem,
              delay_horas: Math.floor(etapa.delay_minutos / 60),
              delay_minutos: etapa.delay_minutos % 60,
              delay_texto: delayToTexto(
                Math.floor(etapa.delay_minutos / 60),
                etapa.delay_minutos % 60
              ),
              mensagem_template: etapa.mensagem_template,
            }))
          : [
              {
                ordem: 1,
                delay_horas: 1,
                delay_minutos: 0,
                delay_texto: "1h",
                mensagem_template: "",
              },
            ],
    });
  }, []);

  const resetForm = useCallback(() => {
    setFormState(createEmptyFormState());
    limparFeedback();
  }, [limparFeedback]);

  const validate = useCallback((): string | null => {
    const { instanciaId, tipoDestino, telefone, evento, mensagemPrincipal, etapas } = formState;

    if (!instanciaId) {
      return "Selecione uma instância WhatsApp.";
    }

    if (tipoDestino === "FIXO" && !telefone.trim()) {
      return "Informe o número de destino.";
    }

    if (evento === "LEAD_STAGE_CHANGED" && !mensagemPrincipal.trim()) {
      return "Mensagem obrigatória para automação imediata.";
    }

    if (evento === "LEAD_FOLLOW_UP" && etapas.some((etapa) => !etapa.mensagem_template.trim())) {
      return "Preencha todas as mensagens da timeline.";
    }

    return null;
  }, [formState]);

  const isValid = useMemo(() => validate() === null, [validate]);

  return {
    formState,
    formErro,
    previewServidor,
    isValid,
    validate,
    setFormErro,
    setPreviewServidor,
    setInstanciaId,
    setEvento,
    setTipoDestino,
    setIdEstagioDestino,
    setTelefone,
    setMensagemPrincipal,
    limparFeedback,
    adicionarEtapa,
    atualizarEtapa,
    removerEtapa,
    getPayload,
    loadFromAutomacao,
    resetForm,
  };
}
