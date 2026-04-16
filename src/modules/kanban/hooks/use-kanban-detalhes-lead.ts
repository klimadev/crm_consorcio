import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { atualizarLeadKanban, uploadDocumentoKanban } from "@/lib/api/kanban";
import type { Lead, StatusSalvamentoDetalhesLead } from "../types";
import { obterMensagemErroKanban } from "../utils/erro";
import { useToast } from "@/components/ui/toast";
import { useAutoSave } from "./use-auto-save";

type UseKanbanDetalhesLeadParams = {
  leadSelecionado: Lead | null;
  setLeadSelecionado: Dispatch<SetStateAction<Lead | null>>;
  setLeads: Dispatch<SetStateAction<Lead[]>>;
};

export function useKanbanDetalhesLead({
  leadSelecionado,
  setLeadSelecionado,
  setLeads,
}: UseKanbanDetalhesLeadParams) {
  const { addToast } = useToast();
  const [erroDetalhesLead, setErroDetalhesLead] = useState<string | null>(null);
  const [documentoAprovacaoUrl, setDocumentoAprovacaoUrl] = useState("");
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [uploadando, setUploadando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [salvandoAutomaticamente, setSalvandoAutomaticamente] = useState(false);
  const [ultimaAtualizacaoSalvaEm, setUltimaAtualizacaoSalvaEm] = useState<Date | null>(null);
  const salvarAutomaticamenteRef = useRef<(leadAtualizado: Lead) => Promise<void>>(async () => {});

  const handleUploadArquivo = useCallback(async (arquivo: File): Promise<string | null> => {
    setUploadando(true);

    try {
      const resposta = await uploadDocumentoKanban(arquivo);
      if (!resposta.ok) {
        setErroDetalhesLead(resposta.erro);
        setArquivoSelecionado(null);
        return null;
      }

      return resposta.dados.url;
    } catch (erro) {
      setErroDetalhesLead(obterMensagemErroKanban(erro, "Erro ao fazer upload."));
      setArquivoSelecionado(null);
      return null;
    } finally {
      setUploadando(false);
    }
  }, []);

  const { autoSavePendente, agendarAutoSave, cancelarAutoSave } = useAutoSave<Lead>({
    delayMs: 1800,
    enabled: Boolean(leadSelecionado),
    onSave: async (leadAtualizado) => {
      await salvarAutomaticamenteRef.current(leadAtualizado);
    },
  });

  const salvarDetalhesLead = useCallback(
    async (
      lead: Lead,
      urlDocumento?: string,
      opcoes?: {
        atualizarSelecionado?: boolean;
        arquivoUpload?: File | null;
        origem?: "manual" | "automatica";
        dataVenda?: string;
      },
    ) => {
      const atualizarSelecionado = opcoes?.atualizarSelecionado ?? true;
      const arquivoParaUpload = opcoes?.arquivoUpload ?? arquivoSelecionado;
      const origem = opcoes?.origem ?? "manual";

      if (origem === "manual") {
        cancelarAutoSave();
      }

      if (origem === "manual") {
        setSalvando(true);
      }

      setSalvandoAutomaticamente(origem === "automatica");
      setSalvo(false);
      setErroDetalhesLead(null);

      try {
        let docUrl = urlDocumento ?? documentoAprovacaoUrl.trim();

        if (arquivoParaUpload) {
          const urlUpload = await handleUploadArquivo(arquivoParaUpload);
          if (!urlUpload) {
            setSalvando(false);
            setSalvandoAutomaticamente(false);
            return;
          }

          docUrl = urlUpload;
          setArquivoSelecionado(null);
        }

        const resposta = await atualizarLeadKanban(lead.id, {
          observacoes: lead.observacoes,
          telefone: lead.telefone,
          valor_consorcio: Number(lead.valor_consorcio),
          documento_aprovacao_url: docUrl || null,
          id_funcionario: lead.id_funcionario,
          data_venda: opcoes?.dataVenda,
        });

        if (!resposta.ok) {
          setErroDetalhesLead(resposta.erro);
          setSalvando(false);
          setSalvandoAutomaticamente(false);
          return;
        }

        if (resposta.dados.lead) {
          const leadAtualizado = resposta.dados.lead;
          setLeads((atual) => atual.map((item) => (item.id === leadAtualizado.id ? leadAtualizado : item)));

          if (atualizarSelecionado) {
            setLeadSelecionado((atual) => (atual && atual.id === leadAtualizado.id ? leadAtualizado : atual));
          }
        }

        setSalvando(false);
        setSalvandoAutomaticamente(false);
        setSalvo(true);
        setUltimaAtualizacaoSalvaEm(new Date());

        if (origem === "manual") {
          addToast({
            type: "success",
            title: "Lead atualizado",
            description: "As alteracoes do lead foram salvas com sucesso.",
          });
        }

        setTimeout(() => setSalvo(false), 2000);
      } catch (erro) {
        setErroDetalhesLead(obterMensagemErroKanban(erro, "Erro ao salvar lead."));
        setSalvando(false);
        setSalvandoAutomaticamente(false);
      }
    },
    [addToast, arquivoSelecionado, cancelarAutoSave, documentoAprovacaoUrl, handleUploadArquivo, setLeads, setLeadSelecionado],
  );

  const removerDocumento = useCallback(async () => {
    if (!leadSelecionado) return;

    setSalvando(true);
    setErroDetalhesLead(null);

    try {
      const resposta = await atualizarLeadKanban(leadSelecionado.id, {
        observacoes: leadSelecionado.observacoes,
        telefone: leadSelecionado.telefone,
        valor_consorcio: Number(leadSelecionado.valor_consorcio),
        documento_aprovacao_url: null,
        id_funcionario: leadSelecionado.id_funcionario,
      });

      if (!resposta.ok) {
        setErroDetalhesLead(resposta.erro);
        return;
      }

      if (resposta.dados.lead) {
        const leadAtualizado = resposta.dados.lead;
        setLeads((atual) => atual.map((item) => (item.id === leadAtualizado.id ? leadAtualizado : item)));
        setLeadSelecionado((atual) => (atual && atual.id === leadAtualizado.id ? leadAtualizado : atual));
        setDocumentoAprovacaoUrl("");
      }

      addToast({
        type: "success",
        title: "Documento removido",
        description: "O documento de aprovação foi removido.",
      });
    } catch (erro) {
      setErroDetalhesLead(obterMensagemErroKanban(erro, "Erro ao remover documento."));
    } finally {
      setSalvando(false);
    }
  }, [leadSelecionado, setLeads, setLeadSelecionado, setDocumentoAprovacaoUrl, addToast]);

  useEffect(() => {
    salvarAutomaticamenteRef.current = async (leadAtualizado) => {
      await salvarDetalhesLead(leadAtualizado, undefined, { origem: "automatica" });
    };
  }, [salvarDetalhesLead]);

  const aoMudarLead = useCallback(
    (leadAtualizado: Lead) => {
      setLeadSelecionado(leadAtualizado);

      if (erroDetalhesLead) {
        setErroDetalhesLead(null);
      }

      setSalvo(false);
      agendarAutoSave(leadAtualizado);
    },
    [agendarAutoSave, erroDetalhesLead, setLeadSelecionado],
  );

  useEffect(() => {
    if (leadSelecionado) {
      setDocumentoAprovacaoUrl(leadSelecionado.documento_aprovacao_url ?? "");
      return;
    }

    cancelarAutoSave();
    setArquivoSelecionado(null);
    setDocumentoAprovacaoUrl("");
    setErroDetalhesLead(null);
    setSalvando(false);
    setSalvandoAutomaticamente(false);
    setSalvo(false);
  }, [cancelarAutoSave, leadSelecionado]);

  const statusSalvamentoDetalhes = useMemo<StatusSalvamentoDetalhesLead>(() => {
    if (erroDetalhesLead) return "erro";
    if (uploadando) return "uploadando";
    if (salvandoAutomaticamente) return "salvando_automaticamente";
    if (salvando) return "salvando_manual";
    if (salvo) return "salvo";
    if (autoSavePendente) return "pendente";
    return "ocioso";
  }, [autoSavePendente, erroDetalhesLead, salvando, salvandoAutomaticamente, salvo, uploadando]);

  return {
    erroDetalhesLead,
    setErroDetalhesLead,
    documentoAprovacaoUrl,
    setDocumentoAprovacaoUrl,
    arquivoSelecionado,
    setArquivoSelecionado,
    uploadando,
    salvando,
    salvo,
    salvandoAutomaticamente,
    salvamentoAutomaticoPendente: autoSavePendente,
    ultimaAtualizacaoSalvaEm,
    statusSalvamentoDetalhes,
    salvarDetalhesLead,
    removerDocumento,
    aoMudarLead,
  };
}
