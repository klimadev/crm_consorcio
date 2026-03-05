import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Lead } from "../types";
import { atualizarLeadKanban, uploadDocumentoKanban } from "@/lib/api/kanban";

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
  const [erroDetalhesLead, setErroDetalhesLead] = useState<string | null>(null);
  const [documentoAprovacaoUrl, setDocumentoAprovacaoUrl] = useState("");
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [uploadando, setUploadando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    } catch {
      setErroDetalhesLead("Erro ao fazer upload.");
      setArquivoSelecionado(null);
      return null;
    } finally {
      setUploadando(false);
    }
  }, []);

  const salvarDetalhesLead = useCallback(
    async (
      lead: Lead,
      urlDocumento?: string,
      opcoes?: { atualizarSelecionado?: boolean; arquivoUpload?: File | null },
    ) => {
      const atualizarSelecionado = opcoes?.atualizarSelecionado ?? true;
      const arquivoParaUpload = opcoes?.arquivoUpload ?? arquivoSelecionado;
      setSalvando(true);
      setSalvo(false);
      setErroDetalhesLead(null);

      try {
        let docUrl = urlDocumento ?? documentoAprovacaoUrl.trim();

        if (arquivoParaUpload) {
          const urlUpload = await handleUploadArquivo(arquivoParaUpload);
          if (!urlUpload) {
            setSalvando(false);
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
        });

        if (!resposta.ok) {
          setErroDetalhesLead(resposta.erro);
          setSalvando(false);
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
        setSalvo(true);
        setTimeout(() => setSalvo(false), 2000);
      } catch {
        setErroDetalhesLead("Erro ao salvar lead.");
        setSalvando(false);
      }
    },
    [arquivoSelecionado, documentoAprovacaoUrl, handleUploadArquivo, setLeads, setLeadSelecionado],
  );

  const aoMudarLead = useCallback(
    (leadAtualizado: Lead) => {
      setLeadSelecionado(leadAtualizado);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        void salvarDetalhesLead(leadAtualizado);
      }, 1000);
    },
    [salvarDetalhesLead, setLeadSelecionado],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (leadSelecionado) {
      setDocumentoAprovacaoUrl(leadSelecionado.documento_aprovacao_url ?? "");
    }
  }, [leadSelecionado]);

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
    salvarDetalhesLead,
    aoMudarLead,
  };
}
