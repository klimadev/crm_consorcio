"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, X, Phone, FileText, Trash2, Send, MessageCircle } from "lucide-react";
import {
  aplicaMascaraMoedaBr,
  aplicaMascaraTelefoneBr,
  converteMoedaBrParaNumero,
} from "@/lib/utils";
import type { Lead, PendenciaDinamica } from "../types";
import { useWhatsappChat } from "@/modules/whatsapp/hooks/use-whatsapp-chat";
import { WhatsappChatPanel } from "@/modules/whatsapp/components/chat/whatsapp-chat-panel";
import type { WhatsappInstancia } from "@/modules/whatsapp/types";

const LABELS_PENDENCIA: Record<string, string> = {
  DOCUMENTO_APROVACAO_PENDENTE: "Documento de Aprovação (Pdf/Link) Pendente",
  ESTAGIO_PARADO: "Lead Parado no Estágio",
};

type LeadDetailsDrawerProps = {
  leadSelecionado: Lead | null;
  pendenciasLead: PendenciaDinamica[];
  onOpenChange: (aberto: boolean) => void;
  perfil: "EMPRESA" | "GERENTE" | "COLABORADOR";
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
  onSalvarDetalhesLead: (lead: Lead, urlDocumento?: string, opcoes?: { atualizarSelecionado?: boolean }) => Promise<void>;
};

export function LeadDetailsDrawer({
  leadSelecionado,
  pendenciasLead,
  onOpenChange,
  perfil,
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
  const [instancias, setInstancias] = useState<WhatsappInstancia[]>([]);
  const [carregandoInstancias, setCarregandoInstancias] = useState(false);
  const [erroInstancias, setErroInstancias] = useState<string | null>(null);

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

  const chatConfigurado = Boolean(leadSelecionado?.id_whatsapp_instancia);

  useEffect(() => {
    if (!leadSelecionado || (perfil !== "EMPRESA" && perfil !== "GERENTE")) return;

    const carregarInstancias = async () => {
      setCarregandoInstancias(true);
      setErroInstancias(null);
      try {
        const resposta = await fetch("/api/whatsapp/instances", { cache: "no-store" });
        const json = (await resposta.json().catch(() => ({}))) as {
          instancias?: WhatsappInstancia[];
          erro?: string;
        };

        if (!resposta.ok) {
          setErroInstancias(json.erro ?? "Erro ao carregar instancias WhatsApp.");
          setInstancias([]);
          return;
        }

        setInstancias(json.instancias ?? []);
      } catch {
        setErroInstancias("Erro ao carregar instancias WhatsApp.");
        setInstancias([]);
      } finally {
        setCarregandoInstancias(false);
      }
    };

    void carregarInstancias();
  }, [leadSelecionado?.id, perfil]);

  const whatsappChat = useWhatsappChat({
    leadId: leadSelecionado?.id,
    enabled: Boolean(leadSelecionado) && chatConfigurado,
    markReadEnabled: tabAtiva === "chat" && Boolean(leadSelecionado) && chatConfigurado,
    pollMs: 30000,
  });

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
                {(perfil === "EMPRESA" || perfil === "GERENTE") ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-emerald-600" />
                      Instância WhatsApp do lead
                    </label>
                    <Select
                      value={leadSelecionado.id_whatsapp_instancia ?? "none"}
                      onValueChange={(value) =>
                        handleMudarLead({
                          ...leadSelecionado,
                          id_whatsapp_instancia: value === "none" ? null : value,
                        })
                      }
                      disabled={carregandoInstancias}
                    >
                      <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-sm text-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20">
                        <SelectValue placeholder="Selecione uma instância" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem instância</SelectItem>
                        {instancias.map((instancia) => (
                          <SelectItem key={instancia.id} value={instancia.id}>
                            {instancia.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {erroInstancias ? <p className="text-xs text-rose-600">{erroInstancias}</p> : null}
                    <p className="text-xs text-slate-500">
                      Sem instância configurada, o chat WhatsApp deste lead fica bloqueado.
                    </p>
                  </div>
                ) : null}

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

                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-emerald-600" />
                    Documento de Aprovação (Pdf)
                  </label>

                  <div className="rounded-xl border-2 border-dashed border-slate-200 p-4 hover:border-emerald-400 transition-colors">
                    <input
                      type="file"
                      accept="application/pdf"
                      id="documento-upload"
                      className="block w-full text-sm text-slate-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-lg file:border-0
                        file:text-sm file:font-medium
                        file:bg-emerald-50 file:text-emerald-700
                        hover:file:bg-emerald-100
                      "
                      onChange={(e) => {
                        const arquivo = e.target.files?.[0];
                        if (arquivo) {
                          if (arquivo.type !== "application/pdf") {
                            return;
                          }
                          if (arquivo.size > 10 * 1024 * 1024) {
                            return;
                          }
                          setArquivoSelecionado(arquivo);
                          setErroDetalhesLead(null);
                          setTimeout(() => onSalvarDetalhesLead(leadSelecionado), 100);
                        }
                      }}
                    />
                  </div>
                  {arquivoSelecionado && (
                    <p className="text-sm text-emerald-600 font-medium">
                      ✓ Arquivo selecionado: {arquivoSelecionado.name}
                    </p>
                  )}

                  <div className="relative">
                    <p className="mb-1 text-xs font-medium text-slate-500">Ou cole uma URL:</p>
                    <Input
                      className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                      placeholder="URL do documento (Google Drive, etc)"
                      value={documentoAprovacaoUrl}
                      onChange={(e) => {
                        setDocumentoAprovacaoUrl(e.target.value);
                        setTemAlteracoes(true);
                        if (e.target.value) setArquivoSelecionado(null);
                      }}
                    />
                  </div>

                  {leadSelecionado?.documento_aprovacao_url && (
                    <a
                      href={leadSelecionado.documento_aprovacao_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                    >
                      <FileText className="h-4 w-4" />
                      Ver documento atual
                    </a>
                  )}

                  <p className="text-xs text-slate-500">
                    O documento de aprovação é opcional, mas sua ausência gera uma pendência.
                  </p>
                </div>

                {pendenciasLead.some((p) => p.tipo === "DOCUMENTO_APROVACAO_PENDENTE") && (
                  <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 p-4 text-sm text-amber-800 shadow-sm">
                    <p className="font-semibold flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Pendência: Documento de Aprovação
                    </p>
                    <p className="mt-1 text-xs">Este lead não possui documento de aprovação anexado.</p>
                  </div>
                )}

                {leadSelecionado.motivo_perda ? (
                  <div className="rounded-xl border border-rose-200/60 bg-rose-50/50 p-4 text-sm text-rose-700 shadow-sm">
                    <p className="font-semibold">Motivo da perda:</p>
                    <p className="mt-1 text-xs">{leadSelecionado.motivo_perda}</p>
                  </div>
                ) : null}

                {pendenciasLead.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-700">Pendências</p>
                    {pendenciasLead.map((pendencia) => (
                      <div
                        key={pendencia.id}
                        className="flex items-center justify-between rounded-xl border border-rose-200/60 bg-rose-50/50 p-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-700">
                            {LABELS_PENDENCIA[pendencia.tipo] || pendencia.tipo}
                          </p>
                          <p className="text-xs text-slate-500">{pendencia.descricao}</p>
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
                  blockedReason={chatConfigurado ? null : "Lead sem instância WhatsApp configurada pela empresa."}
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
