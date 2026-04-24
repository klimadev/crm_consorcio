"use client";

import { useState, useEffect } from "react";
import type { Lead, UseKanbanModuleReturn, Props } from "../types";
import { useToast } from "@/components/ui/toast";
import { useKanbanDerivacoes } from "./use-kanban-derivacoes";
import { useKanbanMovimentacao } from "./use-kanban-movimentacao";
import { useKanbanDados } from "./use-kanban-dados";
import { useKanbanOperacoes } from "./use-kanban-operacoes";
import { useKanbanDetalhesLead } from "./use-kanban-detalhes-lead";
import { obterWhatsappStats } from "@/lib/api/whatsapp";

export function useKanbanModule({ perfil, idUsuario }: Props): UseKanbanModuleReturn {
  const { addToast } = useToast();
  const {
    estagios,
    leads,
    setLeads,
    funcionarios,
    pdvs,
    carregandoInicial,
    bootstrap,
    registrarMovimentoLocal,
    resumoPendencias,
    recarregarPendencias,
    notificacoesAtivadas,
    alternarNotificacoes,
    permissaoNotificacao,
  } = useKanbanDados({ addToast });

  const [leadSelecionado, setLeadSelecionado] = useState<Lead | null>(null);
  const [dialogNovoLeadAberto, setDialogNovoLeadAberto] = useState(false);

  const [cargoNovoLead, setCargoNovoLead] = useState<{ id_funcionario: string } | null>(null);
  const [estagioNovoLead, setEstagioNovoLead] = useState("");
  const [telefoneNovoLead, setTelefoneNovoLead] = useState("");
  const [valorNovoLead, setValorNovoLead] = useState("");

  // Estado para estatísticas do WhatsApp
  const [ultimaSincronizacaoWhatsapp, setUltimaSincronizacaoWhatsapp] = useState<Date | null>(null);
  const [instanciasAtivasCount, setInstanciasAtivasCount] = useState(0);

  // Carregar estatísticas do WhatsApp ao montar o componente
  useEffect(() => {
    async function carregarStatsWhatsapp() {
      const resultado = await obterWhatsappStats();
      if (resultado.ok && resultado.dados) {
        setInstanciasAtivasCount(resultado.dados.ativas);
      }
    }
    carregarStatsWhatsapp();
  }, []);

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
    totalLeadsVisiveis,
    pendenciasCriticasVisiveis,
    estagioAberto,
    origemStats,
    resumoOperacional,
    resumoPorEstagio,
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
    registrarMovimentoLocal,
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
    salvandoAutomaticamente,
    salvamentoAutomaticoPendente,
    ultimaAtualizacaoSalvaEm,
    statusSalvamentoDetalhes,
    salvarDetalhesLead,
    removerDocumento,
    aoMudarLead,
  } = useKanbanDetalhesLead({
    leadSelecionado,
    setLeadSelecionado,
    setLeads,
  });

  const {
    erroNovoLead,
    setErroNovoLead,
    criandoLead,
    sincronizandoWhatsapp,
    redistribuindoEmAtendimento,
    criarLead,
    sincronizarWhatsapp,
    redistribuirLeadsEmAtendimento,
    excluirLead,
    excluirTodosIndefinidos,
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
    aoSincronizarWhatsapp: setUltimaSincronizacaoWhatsapp,
  });

  return {
    estagios,
    leads,
    funcionarios,
    pdvs,
    carregandoInicial,
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
    criandoLead,
    documentoAprovacaoUrl,
    setDocumentoAprovacaoUrl,
    arquivoSelecionado,
    setArquivoSelecionado,
    uploadando,
    salvando,
    salvo,
    salvandoAutomaticamente,
    salvamentoAutomaticoPendente,
    ultimaAtualizacaoSalvaEm,
    statusSalvamentoDetalhes,
    erroDetalhesLead,
    setErroDetalhesLead,
    salvarDetalhesLead,
    removerDocumento,
    setLeadSelecionado,
    criarLead,
    sincronizandoWhatsapp,
    redistribuindoEmAtendimento,
    sincronizarWhatsapp,
    redistribuirLeadsEmAtendimento,
    confirmarPerda,
    aoDragEnd,
    aoMudarLead,
    excluirLead,
    excluirTodosIndefinidos: () => excluirTodosIndefinidos(leads, estagios),
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
    totalLeads: totalLeadsVisiveis,
    pendenciasCriticas: pendenciasCriticasVisiveis,
    origemStats,
    resumoOperacional,
    resumoPorEstagio,
    ultimaSincronizacaoWhatsapp,
    instanciasAtivasCount,
    notificacoesAtivadas,
    alternarNotificacoes,
    permissaoNotificacao,
  };
}
