"use client";

import { useRef } from "react";
import { useKanbanModule } from "./hooks/use-kanban-module";
import { KanbanHeader } from "./components/kanban-header";
import { KanbanBoard } from "./components/kanban-board";
import { PerdaDialog } from "./components/perda-dialog";
import { LeadDetailsDrawer } from "./components/lead-details-drawer";
import type { Lead, Props } from "./types";

export function ModuloKanban({ perfil, idUsuario }: Props) {
  const vm = useKanbanModule({ perfil, idUsuario });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleLeadClick = (lead: Lead) => {
    vm.setLeadSelecionado(lead);
  };

  const handleDrawerOpenChange = (aberto: boolean) => {
    if (!aberto) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      vm.setLeadSelecionado(null);
    }
  };

  return (
    <section className="space-y-5 rounded-2xl bg-slate-50/50 p-4 pb-6 md:p-6">
      <KanbanHeader
        dialogNovoLeadAberto={vm.dialogNovoLeadAberto}
        setDialogNovoLeadAberto={vm.setDialogNovoLeadAberto}
        criarLead={vm.criarLead}
        estagios={vm.estagios}
        funcionarios={vm.funcionarios}
        perfil={perfil}
        telefoneNovoLead={vm.telefoneNovoLead}
        setTelefoneNovoLead={vm.setTelefoneNovoLead}
        valorNovoLead={vm.valorNovoLead}
        setValorNovoLead={vm.setValorNovoLead}
        erroNovoLead={vm.erroNovoLead}
        setErroNovoLead={vm.setErroNovoLead}
        estagioAberto={vm.estagioAberto}
        estagioNovoLead={vm.estagioNovoLead}
        setEstagioNovoLead={vm.setEstagioNovoLead}
        cargoNovoLead={vm.cargoNovoLead}
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
        notificacoesAtivadas={vm.notificacoesAtivadas}
        alternarNotificacoes={vm.alternarNotificacoes}
        permissaoNotificacao={vm.permissaoNotificacao}
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
        onMudarLead={vm.aoMudarLead}
        documentoAprovacaoUrl={vm.documentoAprovacaoUrl}
        setDocumentoAprovacaoUrl={vm.setDocumentoAprovacaoUrl}
        arquivoSelecionado={vm.arquivoSelecionado}
        setArquivoSelecionado={vm.setArquivoSelecionado}
        uploadando={vm.uploadando}
        salvando={vm.salvando}
        salvo={vm.salvo}
        erroDetalhesLead={vm.erroDetalhesLead}
        setErroDetalhesLead={vm.setErroDetalhesLead}
        onExcluirLead={vm.excluirLead}
        onSalvarDetalhesLead={vm.salvarDetalhesLead}
      />
    </section>
  );
}
