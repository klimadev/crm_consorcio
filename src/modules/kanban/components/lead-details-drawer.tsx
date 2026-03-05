"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, X, Phone, FileText, Trash2, MessageCircle, Loader2 } from "lucide-react";
import {
  aplicaMascaraMoedaBr,
  aplicaMascaraTelefoneBr,
  converteMoedaBrParaNumero,
} from "@/lib/utils";
import type { Estagio, Funcionario, Lead, PendenciaDinamica } from "../types";
import { useWhatsappChat } from "@/modules/whatsapp/hooks/use-whatsapp-chat";
import { WhatsappChatPanel } from "@/modules/whatsapp/components/chat/whatsapp-chat-panel";

const LABELS_PENDENCIA: Record<string, string> = {
  DOCUMENTO_APROVACAO_PENDENTE: "Documento de Aprovação (Pdf/Link) Pendente",
  APROVACAO_GERENCIA_PENDENTE: "Pendência de Análise da EMPRESA",
  ESTAGIO_PARADO: "Lead Parado no Estágio",
};

function formatarDataBrUtc(dataIso: string): string {
  const data = new Date(dataIso);
  if (Number.isNaN(data.getTime())) return "";

  const dia = String(data.getUTCDate()).padStart(2, "0");
  const mes = String(data.getUTCMonth() + 1).padStart(2, "0");
  const ano = String(data.getUTCFullYear());
  return `${dia}/${mes}/${ano}`;
}

type LeadDetailsDrawerProps = {
  leadSelecionado: Lead | null;
  pendenciasLead: PendenciaDinamica[];
  onOpenChange: (aberto: boolean) => void;
  perfil: "EMPRESA" | "GERENTE" | "COLABORADOR";
  estagios: Estagio[];
  funcionarios: Funcionario[];
  onMudarLead: (leadAtualizado: Lead) => void;
  documentoAprovacaoUrl: string;
  setDocumentoAprovacaoUrl: (url: string) => void;
  arquivoSelecionado: File | null;
  setArquivoSelecionado: (file: File | null) => void;
  uploadando: boolean;
  salvando: boolean;
  salvo: boolean;
  erroDetalhesLead: string | null;
  setErroDetalhesLead: (erro: string | null) => void;
  onExcluirLead: (id: string) => Promise<void>;
  onSalvarDetalhesLead: (
    lead: Lead,
    urlDocumento?: string,
    opcoes?: { atualizarSelecionado?: boolean; arquivoUpload?: File | null }
  ) => Promise<void>;
};

export function LeadDetailsDrawer({
  leadSelecionado,
  pendenciasLead,
  onOpenChange,
  perfil,
  estagios,
  funcionarios,
  onMudarLead,
  documentoAprovacaoUrl,
  setDocumentoAprovacaoUrl,
  arquivoSelecionado,
  setArquivoSelecionado,
  uploadando,
  salvando,
  salvo,
  erroDetalhesLead,
  setErroDetalhesLead,
  onExcluirLead,
  onSalvarDetalhesLead,
}: LeadDetailsDrawerProps) {
  const [temAlteracoes, setTemAlteracoes] = useState(false);
  const [fecharConfirmado, setFecharConfirmado] = useState(false);
  const [confirmarExclusaoAberta, setConfirmarExclusaoAberta] = useState(false);
  const [tabAtiva, setTabAtiva] = useState("detalhes");
  const [aprovando, setAprovando] = useState(false);
  const [mostrarTrocaDocumento, setMostrarTrocaDocumento] = useState(false);
  const [modoDocumento, setModoDocumento] = useState<"arquivo" | "url">("arquivo");

  const initialUrl = leadSelecionado?.documento_aprovacao_url ?? "";
  const urlEhAlterado = documentoAprovacaoUrl !== initialUrl;

  const hasChanges = temAlteracoes || urlEhAlterado;

  const handleOpenChange = async (aberto: boolean) => {
    if (!aberto && !fecharConfirmado && hasChanges) {
      const confirmar = window.confirm("Você tem alterações não salvas. Deseja descartar as alterações?");
      if (!confirmar) return;
      setFecharConfirmado(true);
    }
    if (aberto || (!hasChanges) || fecharConfirmado) {
      onOpenChange(false);
      setFecharConfirmado(false);
      setTemAlteracoes(false);
      setTabAtiva("detalhes");
    }
  };

  const handleMudarLead = (leadAtualizado: Lead) => {
    onMudarLead(leadAtualizado);
    setTemAlteracoes(true);
  };

  const handleSalvar = async () => {
    if (leadSelecionado) {
      await onSalvarDetalhesLead(leadSelecionado, documentoAprovacaoUrl, {
        atualizarSelecionado: false,
      });
      setTemAlteracoes(false);
    }
  };

  const whatsappChat = useWhatsappChat({
    leadId: leadSelecionado?.id,
    enabled: Boolean(leadSelecionado),
    markReadEnabled: tabAtiva === "chat" && Boolean(leadSelecionado),
    pollMs: 30000,
  });

  const chatBloqueadoPorPdv = whatsappChat.error?.includes("configurada no PDV")
    ? "Lead sem instancia WhatsApp configurada no PDV."
    : null;

  const estagioAtual = leadSelecionado ? estagios.find((estagio) => estagio.id === leadSelecionado.id_estagio) : null;
  const documentoDigitado = documentoAprovacaoUrl.trim();
  const temDocumentoEmEdicao = Boolean(arquivoSelecionado || documentoDigitado || leadSelecionado?.documento_aprovacao_url);
  const temPendenciaDocumentoReal = pendenciasLead.some((p) => p.tipo === "DOCUMENTO_APROVACAO_PENDENTE");
  const temPendenciaDocumento = temPendenciaDocumentoReal && !temDocumentoEmEdicao;
  const pendenciaAprovacao = pendenciasLead.some((p) => p.tipo === "APROVACAO_GERENCIA_PENDENTE");
  const emPreAprovacao = estagioAtual?.nome === "Pré Aprovação";
  const emAnalise = emPreAprovacao && !temPendenciaDocumento && (pendenciaAprovacao || !leadSelecionado?.aprovado_em);
  const aprovado = Boolean(leadSelecionado?.aprovado_em);

  const statusLead = (() => {
    if (temPendenciaDocumento) {
      return {
        rotulo: "Pendência crítica",
        descricao: "Documento de aprovação pendente. Não pode avançar para Fechado.",
        classe: "border-rose-300 bg-rose-50 text-rose-800",
      };
    }

    if (emAnalise) {
      return {
        rotulo: "Pendência de análise",
        descricao: "Aguardando análise/aprovação da EMPRESA para liberar Fechado.",
        classe: "border-amber-300 bg-amber-50 text-amber-800",
      };
    }

    if (aprovado) {
      return {
        rotulo: "Aprovado",
        descricao: "Lead apto para avançar para Fechado.",
        classe: "border-emerald-300 bg-emerald-50 text-emerald-800",
      };
    }

    return {
      rotulo: "Em andamento",
      descricao: "Siga preenchendo os dados e conduzindo o lead no funil.",
      classe: "border-slate-300 bg-slate-50 text-slate-700",
    };
  })();

  const handleAprovarLead = async () => {
    if (!leadSelecionado) return;
    setAprovando(true);
    setErroDetalhesLead(null);

    try {
      const resposta = await fetch(`/api/leads/${leadSelecionado.id}/aprovar`, {
        method: "POST",
      });

      const json = (await resposta.json().catch(() => ({}))) as { erro?: string; lead?: Lead };

      if (!resposta.ok) {
        setErroDetalhesLead(json.erro ?? "Erro ao aprovar lead.");
        return;
      }

      if (json.lead) {
        onMudarLead(json.lead);
      }
    } catch {
      setErroDetalhesLead("Erro ao aprovar lead.");
    } finally {
      setAprovando(false);
    }
  };

  const handleEnviarArquivo = async () => {
    if (!leadSelecionado || !arquivoSelecionado) return;
    await onSalvarDetalhesLead(leadSelecionado, undefined, { arquivoUpload: arquivoSelecionado });
    setTemAlteracoes(false);
    setMostrarTrocaDocumento(false);
  };

  const handleSalvarUrlDocumento = async () => {
    if (!leadSelecionado) return;
    const url = documentoAprovacaoUrl.trim();
    if (!url) {
      setErroDetalhesLead("Informe uma URL valida ou envie um arquivo PDF.");
      return;
    }
    await onSalvarDetalhesLead(leadSelecionado, url);
    setTemAlteracoes(false);
    setMostrarTrocaDocumento(false);
  };

  return (
    <>
      <Sheet open={Boolean(leadSelecionado)} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col h-full overflow-hidden p-0">
          <SheetHeader className="px-4 py-3 border-b bg-gradient-to-r from-emerald-600 to-emerald-700 text-white space-y-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <MessageCircle className="h-5 w-5 flex-shrink-0" />
                <SheetTitle className="text-white text-base truncate">{leadSelecionado?.nome}</SheetTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20 flex-shrink-0"
                onClick={() => handleOpenChange(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <SheetDescription className="text-emerald-100 flex items-center gap-2">
              <Phone className="h-3 w-3" />
              {leadSelecionado?.telefone}
              {salvando && <span className="text-amber-200">• Salvando...</span>}
              {salvo && !salvando && <span className="text-emerald-200">• Salvo ✓</span>}
              {!salvando && !salvo && hasChanges && (
                <span className="flex items-center gap-1 text-amber-200">
                  <AlertCircle className="h-3 w-3" />
                  Alterações não salvas
                </span>
              )}
            </SheetDescription>
          </SheetHeader>

          {leadSelecionado ? (
            <Tabs value={tabAtiva} onValueChange={setTabAtiva} className="flex-1 flex flex-col min-h-0">
              <div className="px-4 py-2 border-b bg-slate-50">
                <TabsList className="grid w-full grid-cols-2 bg-slate-200">
                  <TabsTrigger 
                    value="detalhes" 
                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Detalhes
                  </TabsTrigger>
                  <TabsTrigger 
                    value="chat" 
                    className="relative data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Chat
                    {whatsappChat.unreadCount > 0 ? (
                      <span className="ml-1 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    ) : null}
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="detalhes" className="flex-1 overflow-y-auto p-4 m-0 space-y-4">
                <div className={`rounded-xl border p-4 ${statusLead.classe}`}>
                  <p className="text-sm font-semibold">Status atual: {statusLead.rotulo}</p>
                  <p className="mt-1 text-xs">{statusLead.descricao}</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="mb-3 text-sm font-semibold text-slate-800">Dados editáveis</p>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-emerald-600" />
                    Telefone
                  </label>
                  <Input
                    className="h-11 rounded-xl border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    value={leadSelecionado.telefone}
                    onChange={(e) =>
                      handleMudarLead({
                        ...leadSelecionado,
                        telefone: aplicaMascaraTelefoneBr(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Valor do Consórcio</label>
                  <Input
                    className="h-11 rounded-xl border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    inputMode="numeric"
                    value={aplicaMascaraMoedaBr(String(Math.round(leadSelecionado.valor_consorcio * 100)))}
                    onChange={(e) =>
                      handleMudarLead({
                        ...leadSelecionado,
                        valor_consorcio: converteMoedaBrParaNumero(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Observações</label>
                  <Textarea
                    className="rounded-xl border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 min-h-[100px]"
                    placeholder="Observações..."
                    value={leadSelecionado.observacoes ?? ""}
                    onChange={(e) =>
                      handleMudarLead({
                        ...leadSelecionado,
                        observacoes: e.target.value,
                      })
                    }
                  />
                </div>

                {perfil !== "COLABORADOR" ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Responsavel</label>
                    <Select
                      value={leadSelecionado.id_funcionario}
                      onValueChange={(idFuncionario) =>
                        handleMudarLead({
                          ...leadSelecionado,
                          id_funcionario: idFuncionario,
                        })
                      }
                    >
                      <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-sm text-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20">
                        <SelectValue placeholder="Selecione o responsavel" />
                      </SelectTrigger>
                      <SelectContent>
                        {funcionarios.map((funcionario) => (
                          <SelectItem key={funcionario.id} value={funcionario.id}>
                            {funcionario.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                  <div className="space-y-3">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-emerald-600" />
                      Documento de Aprovação
                    </label>

                  {temDocumentoEmEdicao && !mostrarTrocaDocumento ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <p className="text-sm font-semibold text-emerald-800">
                        {uploadando ? "Enviando documento..." : "Documento enviado com sucesso"}
                      </p>
                      <p className="mt-1 text-xs text-emerald-700">
                        {uploadando
                          ? "Assim que finalizar, o lead entra em pendência de análise da EMPRESA."
                          : "Pendência crítica resolvida. Agora o lead segue para pendência de análise/aprovação."}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {leadSelecionado?.documento_aprovacao_url ? (
                          <a
                            href={leadSelecionado.documento_aprovacao_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Ver documento atual
                          </a>
                        ) : null}
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 rounded-lg border-amber-300 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                          disabled={uploadando}
                          onClick={() => setMostrarTrocaDocumento(true)}
                        >
                          Substituir documento
                        </Button>
                      </div>
                    </div>
                   ) : (
                     <div className="space-y-3 rounded-xl border border-slate-200 p-3">
                       <div className="grid grid-cols-2 gap-2">
                         <Button
                           type="button"
                           variant={modoDocumento === "arquivo" ? "default" : "outline"}
                           className="h-9 rounded-lg"
                           onClick={() => setModoDocumento("arquivo")}
                         >
                           Enviar PDF
                         </Button>
                         <Button
                           type="button"
                           variant={modoDocumento === "url" ? "default" : "outline"}
                           className="h-9 rounded-lg"
                           onClick={() => setModoDocumento("url")}
                         >
                           Informar URL
                         </Button>
                       </div>

                       {modoDocumento === "arquivo" ? (
                         <>
                           <div className="rounded-xl border-2 border-dashed border-slate-200 p-4 hover:border-emerald-400 transition-colors">
                             <input
                               type="file"
                               accept="application/pdf"
                               id="documento-upload"
                               className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-emerald-700 hover:file:bg-emerald-100"
                               onChange={(e) => {
                                 const arquivo = e.target.files?.[0];
                                 if (!arquivo) return;
                                 if (arquivo.type !== "application/pdf") {
                                   setErroDetalhesLead("Apenas arquivos PDF sao permitidos.");
                                   return;
                                 }
                                 if (arquivo.size > 10 * 1024 * 1024) {
                                   setErroDetalhesLead("Arquivo muito grande. Maximo 10MB.");
                                   return;
                                 }
                                 setArquivoSelecionado(arquivo);
                                 setErroDetalhesLead(null);
                                 setTemAlteracoes(true);
                               }}
                             />
                           </div>
                           <p className="text-xs text-slate-500">PDF ate 10MB. Envie e aguarde a confirmacao de salvamento.</p>
                           {arquivoSelecionado ? (
                             <div className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700">
                               Arquivo selecionado: {arquivoSelecionado.name}
                             </div>
                           ) : null}
                           <Button
                             type="button"
                             className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700"
                             disabled={!arquivoSelecionado || uploadando || salvando}
                             onClick={handleEnviarArquivo}
                           >
                             {uploadando || salvando ? (
                               <span className="inline-flex items-center gap-2">
                                 <Loader2 className="h-4 w-4 animate-spin" />
                                 Enviando documento...
                               </span>
                             ) : (
                               "Enviar documento"
                             )}
                           </Button>
                         </>
                       ) : (
                         <>
                           <div className="relative">
                             <p className="mb-1 text-xs font-medium text-slate-500">URL do documento:</p>
                             <Input
                               className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                               placeholder="https://... ou /uploads/arquivo.pdf"
                               value={documentoAprovacaoUrl}
                               onChange={(e) => {
                                 setDocumentoAprovacaoUrl(e.target.value);
                                 setTemAlteracoes(true);
                                 setMostrarTrocaDocumento(true);
                                 if (e.target.value) setArquivoSelecionado(null);
                               }}
                             />
                           </div>
                           <Button
                             type="button"
                             className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700"
                             disabled={salvando || uploadando || !documentoAprovacaoUrl.trim()}
                             onClick={handleSalvarUrlDocumento}
                           >
                             {salvando ? "Salvando URL..." : "Salvar URL do documento"}
                           </Button>
                         </>
                       )}
                     </div>
                   )}

                  <p className="text-xs text-slate-500">
                    Em Pré Aprovação, sem documento o lead fica com pendência crítica e não pode chegar em Fechado.
                  </p>
                </div>
                </div>

                {pendenciasLead.some((p) => p.tipo === "DOCUMENTO_APROVACAO_PENDENTE") && (
                  <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 shadow-sm">
                    <p className="font-semibold flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Pendência: Documento de Aprovação
                    </p>
                    <p className="mt-1 text-xs">Este lead não possui documento de aprovação anexado.</p>
                  </div>
                )}

                {emPreAprovacao &&
                leadSelecionado.documento_aprovacao_url &&
                !leadSelecionado.aprovado_em &&
                perfil !== "COLABORADOR" ? (
                  <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 shadow-sm">
                    <p className="mb-2 text-sm font-semibold text-amber-800">⚠️ Pendência de análise da EMPRESA (Pré Aprovação)</p>
                    <Button
                      className="w-full rounded-xl bg-amber-500 font-medium text-white hover:bg-amber-600"
                      onClick={handleAprovarLead}
                      disabled={aprovando}
                    >
                      {aprovando ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Aprovando...
                        </span>
                      ) : (
                        "✅ Aprovar Lead"
                      )}
                    </Button>
                  </div>
                ) : null}

                {leadSelecionado.aprovado_em ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    <p className="font-semibold">✅ Lead aprovado</p>
                    <p className="mt-1 text-xs">
                      Aprovado em {formatarDataBrUtc(leadSelecionado.aprovado_em)}
                    </p>
                  </div>
                ) : null}

                {leadSelecionado.motivo_perda ? (
                  <div className="rounded-xl border border-rose-200/60 bg-rose-50/50 p-4 text-sm text-rose-700 shadow-sm">
                    <p className="font-semibold">Motivo da perda:</p>
                    <p className="mt-1 text-xs">{leadSelecionado.motivo_perda}</p>
                  </div>
                ) : null}

                {pendenciasLead.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-700">Pendências e próximos passos</p>
                    {pendenciasLead.map((pendencia) => (
                      <div
                        key={pendencia.id}
                        className={
                          pendencia.tipo === "DOCUMENTO_APROVACAO_PENDENTE"
                            ? "rounded-xl border border-rose-200/60 bg-rose-50/60 p-3"
                            : "rounded-xl border border-amber-200/70 bg-amber-50/60 p-3"
                        }
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-700">
                            {LABELS_PENDENCIA[pendencia.tipo] || pendencia.tipo}
                          </p>
                          <p className="text-xs text-slate-500">{pendencia.descricao}</p>
                          <p className={
                            pendencia.tipo === "DOCUMENTO_APROVACAO_PENDENTE"
                              ? "mt-1 text-xs font-medium text-rose-700"
                              : "mt-1 text-xs font-medium text-amber-700"
                          }>
                            {pendencia.tipo === "DOCUMENTO_APROVACAO_PENDENTE"
                                ? "Ação recomendada: anexar documento para liberar a análise da EMPRESA."
                                : pendencia.tipo === "APROVACAO_GERENCIA_PENDENTE"
                                  ? "Ação recomendada: solicitar análise/aprovação da EMPRESA."
                                  : "Ação recomendada: atualizar o lead para destravar o andamento."}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {erroDetalhesLead ? (
                  <p className="text-sm font-medium text-rose-600 bg-rose-50 p-3 rounded-xl">{erroDetalhesLead}</p>
                ) : null}

                {hasChanges && (
                  <Button
                    className="w-full rounded-xl text-sm font-medium bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleSalvar}
                    disabled={salvando}
                  >
                    {salvando ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                )}

                <div className="pt-4 border-t">
                  <Button
                    variant="destructive"
                    className="w-full rounded-xl text-sm font-medium"
                    onClick={() => setConfirmarExclusaoAberta(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Lead
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="chat" className="flex-1 m-0 overflow-hidden">
                <WhatsappChatPanel
                  leadNome={leadSelecionado.nome}
                  messages={whatsappChat.messages}
                  connectionStatus={whatsappChat.connectionStatus}
                  loading={whatsappChat.loading}
                  sending={whatsappChat.sending}
                  canSend={whatsappChat.canSend}
                  error={whatsappChat.error}
                  blockedReason={chatBloqueadoPorPdv}
                  onSendMessage={whatsappChat.sendMessage}
                  onRetryMessage={whatsappChat.retryMessage}
                />
              </TabsContent>
            </Tabs>
          ) : null}
        </SheetContent>
      </Sheet>

      {confirmarExclusaoAberta && leadSelecionado && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-rose-100 flex items-center justify-center">
                <Trash2 className="h-6 w-6 text-rose-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-center text-slate-900 mb-2">Excluir lead</h3>
            <p className="text-sm text-slate-600 text-center mb-6">
              Tem certeza que deseja excluir <strong>{leadSelecionado.nome}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setConfirmarExclusaoAberta(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                className="flex-1 rounded-xl"
                onClick={async () => {
                  await onExcluirLead(leadSelecionado.id);
                  setConfirmarExclusaoAberta(false);
                }}
              >
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
