"use client";

import { useState } from "react";
import type { Lead, UseKanbanModuleReturn, Props } from "../types";
import { useToast } from "@/components/ui/toast";
import { useKanbanDerivacoes } from "./use-kanban-derivacoes";
import { useKanbanMovimentacao } from "./use-kanban-movimentacao";
import { useKanbanDados } from "./use-kanban-dados";
import { useKanbanOperacoes } from "./use-kanban-operacoes";
import { useKanbanDetalhesLead } from "./use-kanban-detalhes-lead";

export function useKanbanModule({ perfil, idUsuario }: Props): UseKanbanModuleReturn {
  const { addToast } = useToast();
  const {
    estagios,
    leads,
    setLeads,
    funcionarios,
    bootstrap,
    resumoPendencias,
    recarregarPendencias,
    notificacoesAtivadas,
    alternarNotificacoes,
    permissaoNotificacao,
  } = useKanbanDados();

  const [leadSelecionado, setLeadSelecionado] = useState<Lead | null>(null);
  const [dialogNovoLeadAberto, setDialogNovoLeadAberto] = useState(false);

  const [cargoNovoLead, setCargoNovoLead] = useState<{ id_funcionario: string } | null>(null);
  const [estagioNovoLead, setEstagioNovoLead] = useState("");
  const [telefoneNovoLead, setTelefoneNovoLead] = useState("");
  const [valorNovoLead, setValorNovoLead] = useState("");

  const {
    filtros,
    setFiltros,
    modoFocoPendencias,
    setModoFocoPendencias,
    busca,
    setBusca,
    ordenacao,
    setOrdenacao,
    pendenciasPorLead,
    pendenciasLead,
    leadsPorEstagio,
    leadsFiltradosPorEstagio,
    estagioAberto,
  } = useKanbanDerivacoes({
    estagios,
    leads,
    leadSelecionado,
  });

  const {
    movimentoPendente,
    setMovimentoPendente,
    motivoPerda,
    setMotivoPerda,
    aoDragEnd,
    confirmarPerda,
  } = useKanbanMovimentacao({
    leads,
    estagios,
    setLeads,
    addToast,
  });

  const {
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
  } = useKanbanDetalhesLead({
    leadSelecionado,
    setLeadSelecionado,
    setLeads,
  });

  const {
    erroNovoLead,
    setErroNovoLead,
    sincronizandoWhatsapp,
    criarLead,
    sincronizarWhatsapp,
    excluirLead,
  } = useKanbanOperacoes({
    perfil,
    idUsuario,
    telefoneNovoLead,
    valorNovoLead,
    cargoNovoLead,
    setLeads,
    setLeadSelecionado,
    setDialogNovoLeadAberto,
    setCargoNovoLead,
    setEstagioNovoLead,
    setTelefoneNovoLead,
    setValorNovoLead,
    bootstrap,
    setErroDetalhesLead,
  });

  return {
    estagios,
    leads,
    funcionarios,
    leadsPorEstagio,
    leadsFiltradosPorEstagio,
    pendenciasPorLead,
    todasPendencias: [],
    resumoPendencias,
    leadSelecionado,
    pendenciasLead,
    dialogNovoLeadAberto,
    setDialogNovoLeadAberto,
    movimentoPendente,
    setMovimentoPendente,
    motivoPerda,
    setMotivoPerda,
    telefoneNovoLead,
    setTelefoneNovoLead,
    valorNovoLead,
    setValorNovoLead,
    erroNovoLead,
    setErroNovoLead,
    documentoAprovacaoUrl,
    setDocumentoAprovacaoUrl,
    arquivoSelecionado,
    setArquivoSelecionado,
    uploadando,
    salvando,
    salvo,
    erroDetalhesLead,
    setErroDetalhesLead,
    salvarDetalhesLead,
    setLeadSelecionado,
    criarLead,
    sincronizandoWhatsapp,
    sincronizarWhatsapp,
    confirmarPerda,
    aoDragEnd,
    aoMudarLead,
    excluirLead,
    estagioAberto,
    cargoNovoLead,
    setCargoNovoLead,
    setEstagioNovoLead,
    estagioNovoLead,
    filtros,
    setFiltros,
    busca,
    setBusca,
    ordenacao,
    setOrdenacao,
    modoFocoPendencias,
    setModoFocoPendencias,
    recarregarPendencias,
    notificacoesAtivadas,
    alternarNotificacoes,
    permissaoNotificacao,
  };
}
