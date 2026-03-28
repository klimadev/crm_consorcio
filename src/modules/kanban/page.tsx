"use client";
import { useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useKanbanModule } from "./hooks/use-kanban-module";
import { ModulePageShell } from "@/components/shared/module-page-shell";
import { KanbanHeader } from "./components/kanban-header";
import { KanbanBoard } from "./components/kanban-board";
import { PerdaDialog } from "./components/perda-dialog";
import { LeadDetailsDrawer } from "./components/lead-details-drawer";
import type { Lead, Props } from "./types";

export function ModuloKanban({ perfil, idUsuario }: Props) {
  const vm = useKanbanModule({ perfil, idUsuario });
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { leadSelecionado, leads, setLeadSelecionado } = vm;
  const leadIdNaUrl = searchParams.get("lead");

  const atualizarRotaLead = useCallback((leadId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());

    if (leadId) {
      params.set("lead", leadId);
    } else {
      params.delete("lead");
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!leadIdNaUrl) {
      if (leadSelecionado) {
        setLeadSelecionado(null);
      }
      return;
    }

    if (leads.length === 0) return;

    const lead = leads.find((item) => item.id === leadIdNaUrl);
    if (!lead) {
      atualizarRotaLead(null);
      return;
    }

    if (leadSelecionado?.id !== lead.id) {
      setLeadSelecionado(lead);
    }
  }, [atualizarRotaLead, leadIdNaUrl, leadSelecionado?.id, leads, setLeadSelecionado]);

  const handleLeadClick = (lead: Lead) => {
    atualizarRotaLead(lead.id);
  };

  const handleDrawerOpenChange = (aberto: boolean) => {
    if (!aberto) {
      atualizarRotaLead(null);
    }
  };

  return (
    <ModulePageShell>
      <KanbanHeader
        dialogNovoLeadAberto={vm.dialogNovoLeadAberto}
        setDialogNovoLeadAberto={vm.setDialogNovoLeadAberto}
        criarLead={vm.criarLead}
        estagios={vm.estagios}
        funcionarios={vm.funcionarios}
        pdvs={vm.pdvs}
        perfil={perfil}
        telefoneNovoLead={vm.telefoneNovoLead}
        setTelefoneNovoLead={vm.setTelefoneNovoLead}
        valorNovoLead={vm.valorNovoLead}
        setValorNovoLead={vm.setValorNovoLead}
        erroNovoLead={vm.erroNovoLead}
        setErroNovoLead={vm.setErroNovoLead}
        criandoLead={vm.criandoLead}
        cargoNovoLead={vm.cargoNovoLead}
        estagioAberto={vm.estagioAberto}
        estagioNovoLead={vm.estagioNovoLead}
        setEstagioNovoLead={vm.setEstagioNovoLead}
        setCargoNovoLead={vm.setCargoNovoLead}
        filtros={vm.filtros}
        setFiltros={vm.setFiltros}
        busca={vm.busca}
        setBusca={vm.setBusca}
        ordenacao={vm.ordenacao}
        setOrdenacao={vm.setOrdenacao}
        modoFocoPendencias={vm.modoFocoPendencias}
        setModoFocoPendencias={vm.setModoFocoPendencias}
        resumoPendencias={vm.resumoPendencias}
        totalLeads={vm.totalLeads}
        pendenciasCriticas={vm.pendenciasCriticas}
        origemStats={vm.origemStats}
        ultimaSincronizacaoWhatsapp={vm.ultimaSincronizacaoWhatsapp}
        instanciasAtivasCount={vm.instanciasAtivasCount}
        notificacoesAtivadas={vm.notificacoesAtivadas}
        alternarNotificacoes={vm.alternarNotificacoes}
        permissaoNotificacao={vm.permissaoNotificacao}
        sincronizandoWhatsapp={vm.sincronizandoWhatsapp}
        sincronizarWhatsapp={vm.sincronizarWhatsapp}
        redistribuindoEmAtendimento={vm.redistribuindoEmAtendimento}
        redistribuirLeadsEmAtendimento={vm.redistribuirLeadsEmAtendimento}
      />

      <KanbanBoard
        estagios={vm.estagios}
        leadsPorEstagio={vm.leadsPorEstagio}
        leadsFiltradosPorEstagio={vm.leadsFiltradosPorEstagio}
        pendenciasPorLead={vm.pendenciasPorLead}
        todasPendencias={vm.todasPendencias}
        onDragEnd={vm.aoDragEnd}
        onLeadClick={handleLeadClick}
        modoFocoPendencias={vm.modoFocoPendencias}
        funcionarios={vm.funcionarios}
        excluirTodosIndefinidos={vm.excluirTodosIndefinidos}
        temFiltrosAtivos={
          vm.filtros.status !== "todos" ||
          vm.filtros.gravidade !== "todas" ||
          vm.filtros.tipo !== "todos" ||
          vm.filtros.pdv !== null ||
          vm.filtros.origem !== "todos" ||
          vm.busca !== ""
        }
      />

      <PerdaDialog
        movimentoPendente={vm.movimentoPendente}
        motivoPerda={vm.motivoPerda}
        setMotivoPerda={vm.setMotivoPerda}
        onConfirmarPerda={vm.confirmarPerda}
        onOpenChange={(aberto) => !aberto && vm.setMovimentoPendente(null)}
      />

      <LeadDetailsDrawer
        leadSelecionado={vm.leadSelecionado}
        pendenciasLead={vm.pendenciasLead}
        onOpenChange={handleDrawerOpenChange}
        perfil={perfil}
        estagios={vm.estagios}
        funcionarios={vm.funcionarios}
        onMudarLead={vm.aoMudarLead}
        documentoAprovacaoUrl={vm.documentoAprovacaoUrl}
        setDocumentoAprovacaoUrl={vm.setDocumentoAprovacaoUrl}
        arquivoSelecionado={vm.arquivoSelecionado}
        setArquivoSelecionado={vm.setArquivoSelecionado}
        uploadando={vm.uploadando}
        salvando={vm.salvando}
        salvo={vm.salvo}
        salvandoAutomaticamente={vm.salvandoAutomaticamente}
        salvamentoAutomaticoPendente={vm.salvamentoAutomaticoPendente}
        ultimaAtualizacaoSalvaEm={vm.ultimaAtualizacaoSalvaEm}
        statusSalvamentoDetalhes={vm.statusSalvamentoDetalhes}
        erroDetalhesLead={vm.erroDetalhesLead}
        setErroDetalhesLead={vm.setErroDetalhesLead}
        onExcluirLead={vm.excluirLead}
        onSalvarDetalhesLead={vm.salvarDetalhesLead}
        onRemoverDocumento={vm.removerDocumento}
      />
    </ModulePageShell>
  );
}
