"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useKanbanModule } from "./hooks/use-kanban-module";
import { KanbanHeader } from "./components/kanban-header";
import { KanbanBoard } from "./components/kanban-board";
import { PerdaDialog } from "./components/perda-dialog";
import { LeadDetailsDrawer } from "./components/lead-details-drawer";
import type { Lead, PendenciaLead, Props } from "./types";

export function ModuloKanban({ perfil, idUsuario }: Props) {
  const vm = useKanbanModule({ perfil, idUsuario });
  const [todasPendencias, setTodasPendencias] = useState<PendenciaLead[]>([]);
  const [pendenciasLead, setPendenciasLead] = useState<PendenciaLead[]>([]);
  const [documentoAprovacaoUrl, setDocumentoAprovacaoUrl] = useState("");
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [uploadando, setUploadando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erroDetalhesLead, setErroDetalhesLead] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleUploadArquivo = useCallback(async (): Promise<string | null> => {
    if (!arquivoSelecionado) return null;
    setUploadando(true);
    const formData = new FormData();
    formData.append("arquivo", arquivoSelecionado);
    try {
      const resposta = await fetch("/api/upload", { method: "POST", body: formData });
      if (!resposta.ok) {
        const json = await resposta.json();
        setErroDetalhesLead(json.erro ?? "Erro ao fazer upload.");
        return null;
      }
      const json = await resposta.json();
      return json.url;
    } catch {
      setErroDetalhesLead("Erro ao fazer upload.");
      return null;
    } finally {
      setUploadando(false);
    }
  }, [arquivoSelecionado]);

  const salvarDetalhesLead = useCallback(async (lead: Lead, urlDocumento?: string) => {
    setSalvando(true);
    setSalvo(false);
    setErroDetalhesLead(null);
    try {
      let docUrl = urlDocumento ?? documentoAprovacaoUrl.trim();
      if (arquivoSelecionado) {
        const urlUpload = await handleUploadArquivo();
        if (!urlUpload) {
          setSalvando(false);
          return;
        }
        docUrl = urlUpload;
        setArquivoSelecionado(null);
      }
      const resposta = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          observacoes: lead.observacoes,
          telefone: lead.telefone,
          valor_consorcio: Number(lead.valor_consorcio),
          documento_aprovacao_url: docUrl || null,
        }),
      });
      if (!resposta.ok) {
        const json = await resposta.json();
        setErroDetalhesLead(json.erro ?? "Erro ao salvar lead.");
        setSalvando(false);
        return;
      }
      const json = await resposta.json();
      if (json.lead) {
        setSalvando(false);
        setSalvo(true);
        setTimeout(() => setSalvo(false), 2000);
      }
    } catch {
      setErroDetalhesLead("Erro ao salvar lead.");
      setSalvando(false);
    }
  }, [documentoAprovacaoUrl, arquivoSelecionado, handleUploadArquivo]);

  const aoMudarLead = useCallback((leadAtualizado: Lead) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => salvarDetalhesLead(leadAtualizado), 1000);
  }, [salvarDetalhesLead]);

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  const handleLeadClick = (lead: Lead) => {
    vm.setLeadSelecionado(lead);
    setDocumentoAprovacaoUrl(lead.documento_aprovacao_url ?? "");
  };

  const handleDrawerOpenChange = (aberto: boolean) => {
    if (!aberto && vm.leadSelecionado) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      salvarDetalhesLead(vm.leadSelecionado, documentoAprovacaoUrl);
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
      />

      <KanbanBoard
        estagios={vm.estagios}
        leadsPorEstagio={vm.leadsPorEstagio}
        pendenciasPorLead={vm.pendenciasPorLead}
        todasPendencias={todasPendencias}
        onDragEnd={vm.aoDragEnd}
        onLeadClick={handleLeadClick}
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
        pendenciasLead={pendenciasLead}
        onOpenChange={handleDrawerOpenChange}
        onMudarLead={aoMudarLead}
        documentoAprovacaoUrl={documentoAprovacaoUrl}
        setDocumentoAprovacaoUrl={setDocumentoAprovacaoUrl}
        arquivoSelecionado={arquivoSelecionado}
        setArquivoSelecionado={setArquivoSelecionado}
        uploadando={uploadando}
        salvando={salvando}
        salvo={salvo}
        erroDetalhesLead={erroDetalhesLead}
        setErroDetalhesLead={setErroDetalhesLead}
        onTogglePendenciaResolvida={vm.togglePendenciaResolvida}
        onExcluirLead={vm.excluirLead}
        onSalvarDetalhesLead={salvarDetalhesLead}
      />
    </section>
  );
}
