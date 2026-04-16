import { AlertCircle, Building2, CheckCircle2, Clock3, FileText, Phone, ShieldCheck, Trash2, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { aplicaMascaraMoedaBr, aplicaMascaraTelefoneBr, cn, converteMoedaBrParaNumero } from "@/lib/utils";
import type { Estagio, Funcionario, Lead, PendenciaDinamica } from "../types";
import { ActionButton } from "./action-button";
import { MENSAGENS_KANBAN } from "../utils/mensagens";
import { validarArquivoDocumentoLead, validarDocumentoLeadUrl, validarTelefoneLead } from "../utils/validacoes";

const LABELS_PENDENCIA: Record<string, string> = {
  DOCUMENTO_APROVACAO_PENDENTE: "Documento de Aprovação (Pdf/Link) Pendente",
  APROVACAO_GERENCIA_PENDENTE: "Pendência de Análise da EMPRESA",
  ESTAGIO_PARADO: "Lead Parado no Estágio",
};

type LeadDetailsTabContentProps = {
  leadSelecionado: Lead;
  perfil: "EMPRESA" | "GERENTE" | "COLABORADOR";
  estagios: Estagio[];
  funcionarios: Funcionario[];
  pendenciasLead: PendenciaDinamica[];
  documentoAprovacaoUrl: string;
  setDocumentoAprovacaoUrl: (url: string) => void;
  arquivoSelecionado: File | null;
  setArquivoSelecionado: (file: File | null) => void;
  uploadando: boolean;
  salvando: boolean;
  erroDetalhesLead: string | null;
  setErroDetalhesLead: (erro: string | null) => void;
  onMudarLead: (leadAtualizado: Lead) => void;
  onSalvar: () => Promise<void>;
  onEnviarArquivo: () => Promise<void>;
  onSalvarUrlDocumento: () => Promise<void>;
  onRemoverDocumento: () => Promise<void>;
  onAprovarLead: () => Promise<void>;
  onSalvarDataVenda: () => Promise<void>;
  dataAprovacao: string;
  setDataAprovacao: (value: string) => void;
  onExcluir: () => void;
  hasChanges: boolean;
  aprovando: boolean;
  mostrarTrocaDocumento: boolean;
  setMostrarTrocaDocumento: (value: boolean) => void;
  modoDocumento: "arquivo" | "url";
  setModoDocumento: (value: "arquivo" | "url") => void;
  temAlteracoes: boolean;
  setTemAlteracoes: (value: boolean) => void;
};

export function LeadDetailsTabContent(props: LeadDetailsTabContentProps) {
  const {
    leadSelecionado,
    perfil,
    estagios,
    funcionarios,
    pendenciasLead,
    documentoAprovacaoUrl,
    setDocumentoAprovacaoUrl,
    arquivoSelecionado,
    setArquivoSelecionado,
    uploadando,
    salvando,
    erroDetalhesLead,
    setErroDetalhesLead,
    onMudarLead,
    onSalvar,
    onEnviarArquivo,
    onSalvarUrlDocumento,
    onRemoverDocumento,
    onAprovarLead,
    onSalvarDataVenda,
    dataAprovacao,
    setDataAprovacao,
    onExcluir,
    hasChanges,
    aprovando,
    mostrarTrocaDocumento,
    setMostrarTrocaDocumento,
    modoDocumento,
    setModoDocumento,
    setTemAlteracoes,
  } = props;

  const estagioAtual = estagios.find((estagio) => estagio.id === leadSelecionado.id_estagio) ?? null;
  const documentoDigitado = documentoAprovacaoUrl.trim();
  const temDocumentoEmEdicao = Boolean(arquivoSelecionado || documentoDigitado || leadSelecionado.documento_aprovacao_url);
  const temPendenciaDocumentoReal = pendenciasLead.some((p) => p.tipo === "DOCUMENTO_APROVACAO_PENDENTE");
  const temPendenciaDocumento = temPendenciaDocumentoReal && !temDocumentoEmEdicao;
  const pendenciaAprovacao = pendenciasLead.some((p) => p.tipo === "APROVACAO_GERENCIA_PENDENTE");
  const emPreAprovacao = estagioAtual?.nome === "Pré Aprovação";
  const emAnalise = emPreAprovacao && !temPendenciaDocumento && (pendenciaAprovacao || !leadSelecionado.aprovado_em);
  const mensagemTelefoneInvalido = validarTelefoneLead(leadSelecionado.telefone);
  const mensagemUrlDocumento = modoDocumento === "url" ? validarDocumentoLeadUrl(documentoDigitado) : null;
  const tamanhoArquivoSelecionado = arquivoSelecionado ? `${(arquivoSelecionado.size / (1024 * 1024)).toFixed(1)} MB` : null;
  const totalPendencias = pendenciasLead.length;
  const proximoPasso = temPendenciaDocumento
    ? "Enviar documento de aprovação"
    : emAnalise
      ? "Aprovar lead pela empresa"
      : hasChanges
        ? "Salvar ajustes do lead"
        : "Seguir condução comercial";

  const statusLead = temPendenciaDocumento
    ? { rotulo: "Pendência crítica", descricao: "Documento de aprovação pendente. Não pode avançar para Fechado.", classe: "border-destructive/25 bg-destructive/10 text-foreground" }
    : emAnalise
      ? { rotulo: "Pendência de análise", descricao: "Aguardando análise/aprovação da EMPRESA para liberar Fechado.", classe: "border-warning/25 bg-warning/10 text-foreground" }
      : leadSelecionado.aprovado_em
        ? { rotulo: "Aprovado", descricao: "Lead apto para avançar para Fechado.", classe: "border-success/25 bg-success/10 text-foreground" }
        : { rotulo: "Em andamento", descricao: "Siga preenchendo os dados e conduzindo o lead no funil.", classe: "border-border bg-muted text-foreground" };

  return (
    <div className="space-y-4 p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className={cn("rounded-2xl border p-4 md:col-span-2", statusLead.classe)}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground-disabled">Status operacional</p>
          <p className="mt-1 text-base font-semibold text-foreground">{statusLead.rotulo}</p>
          <p className="mt-1 text-sm text-foreground-muted">{statusLead.descricao}</p>

          <div className="mt-4 rounded-xl border border-border/70 bg-background/70 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground-disabled">Próximo passo</p>
            <div className="mt-1 flex items-center gap-2 text-sm font-medium text-foreground">
              {temPendenciaDocumento ? <FileText className="h-4 w-4 text-destructive" /> : null}
              {emAnalise ? <ShieldCheck className="h-4 w-4 text-warning" /> : null}
              {!temPendenciaDocumento && !emAnalise && hasChanges ? <Clock3 className="h-4 w-4 text-info" /> : null}
              {!temPendenciaDocumento && !emAnalise && !hasChanges ? <CheckCircle2 className="h-4 w-4 text-success" /> : null}
              <span>{proximoPasso}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background-surface p-4 shadow-sm shadow-black/20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground-disabled">Resumo rápido</p>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-xl bg-muted/70 px-3 py-2">
              <span className="text-foreground-muted">Pendências</span>
              <span className="font-semibold text-foreground">{totalPendencias}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-muted/70 px-3 py-2">
              <span className="text-foreground-muted">Documento</span>
              <span className="font-semibold text-foreground">{leadSelecionado.documento_aprovacao_url ? "Enviado" : "Pendente"}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-muted/70 px-3 py-2">
              <span className="text-foreground-muted">Ajustes locais</span>
              <span className="font-semibold text-foreground">{hasChanges ? "Sim" : "Não"}</span>
            </div>
          </div>

          {hasChanges ? (
            <ActionButton className="mt-4 w-full rounded-xl bg-success text-sm font-medium hover:bg-success/90" onClick={() => void onSalvar()} disabled={salvando || uploadando} loading={salvando} loadingText="Salvando alteracoes...">
              Salvar alterações
            </ActionButton>
          ) : null}

          {perfil === "EMPRESA" && (emPreAprovacao || leadSelecionado.aprovado_em) ? (
            <div className="mt-3 space-y-2">
              <label className="text-xs font-medium text-foreground-muted">Data da venda</label>
              <DatePicker
                value={dataAprovacao}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(value) => {
                  setDataAprovacao(value);
                  setTemAlteracoes(true);
                }}
                disabled={aprovando || salvando || uploadando}
              />
              {emPreAprovacao && leadSelecionado.documento_aprovacao_url && !leadSelecionado.aprovado_em ? (
                <ActionButton className="w-full rounded-xl bg-warning font-medium text-warning-foreground hover:bg-warning/90" onClick={() => void onAprovarLead()} disabled={aprovando || !dataAprovacao} loading={aprovando} loadingText="Aprovando lead...">
                  Aprovar lead
                </ActionButton>
              ) : null}
              {leadSelecionado.aprovado_em ? (
                <ActionButton
                  className="w-full rounded-xl bg-success text-sm font-medium hover:bg-success/90"
                  onClick={() => void onSalvarDataVenda()}
                  disabled={salvando || uploadando || aprovando || !dataAprovacao}
                  loading={salvando}
                  loadingText="Salvando data da venda..."
                >
                  Salvar data da venda
                </ActionButton>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {pendenciasLead.length > 0 ? (
        <div className="rounded-2xl border border-warning/25 bg-warning/10 p-4">
          <p className="text-sm font-semibold text-foreground">Pendências e próximos passos</p>
          <div className="mt-3 space-y-2">
            {pendenciasLead.map((pendencia) => (
              <div key={pendencia.id} className="rounded-xl border border-warning/20 bg-background/70 p-3">
                <p className="text-sm font-semibold text-foreground">{LABELS_PENDENCIA[pendencia.tipo] || pendencia.tipo}</p>
                <p className="mt-1 text-xs text-foreground-muted">{pendencia.descricao}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-border bg-background-surface p-4 shadow-sm shadow-black/20">
        <p className="mb-3 text-sm font-semibold text-foreground">Dados editáveis</p>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Phone className="h-4 w-4 text-success" />
            Telefone
          </label>
          <Input
            className="h-11 rounded-xl"
            value={leadSelecionado.telefone}
            onChange={(e) => onMudarLead({ ...leadSelecionado, telefone: aplicaMascaraTelefoneBr(e.target.value) })}
          />
          {mensagemTelefoneInvalido ? (
            <div className="flex items-start gap-2 rounded-xl border border-warning/25 bg-warning/10 px-3 py-2 text-xs text-foreground">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{mensagemTelefoneInvalido}</span>
            </div>
          ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Valor do Consórcio</label>
            <Input
              className="h-11 rounded-xl"
              inputMode="numeric"
              value={aplicaMascaraMoedaBr(String(Math.round(leadSelecionado.valor_consorcio * 100)))}
              onChange={(e) => onMudarLead({ ...leadSelecionado, valor_consorcio: converteMoedaBrParaNumero(e.target.value) })}
            />
          </div>

          {perfil !== "COLABORADOR" ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Responsável</label>
              <Select value={leadSelecionado.id_funcionario} onValueChange={(id_funcionario) => onMudarLead({ ...leadSelecionado, id_funcionario })}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Selecione o responsável" />
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

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Building2 className="h-4 w-4 text-success" />
              PDV / Loja
            </label>
            <div className="flex min-h-11 items-center rounded-xl border border-border bg-muted px-3 text-sm font-medium text-foreground">
              {leadSelecionado.pdv?.nome ?? "PDV não informado"}
            </div>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <label className="text-sm font-medium text-foreground">Observações</label>
          <Textarea
            className="min-h-[100px] rounded-xl"
            value={leadSelecionado.observacoes ?? ""}
            onChange={(e) => onMudarLead({ ...leadSelecionado, observacoes: e.target.value })}
          />
        </div>

        {leadSelecionado.gestores && leadSelecionado.gestores.length > 0 && (
          <div className="mt-3 space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <UserCog className="h-4 w-4 text-success" />
              {leadSelecionado.gestores.length > 1 ? "Gestores" : "Gestor"}
            </label>
            <div className="flex min-h-11 flex-wrap items-center gap-1 rounded-xl border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground">
              {leadSelecionado.gestores.map((g, i) => (
                <span key={i} className="inline-flex items-center rounded-lg bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                  {g.nome}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <FileText className="h-4 w-4 text-success" />
            Documento de Aprovação
          </label>

          {temDocumentoEmEdicao && !mostrarTrocaDocumento ? (
            <div className="rounded-xl border border-success/25 bg-success/10 p-3">
              <p className="text-sm font-semibold text-success">{uploadando ? "Enviando documento..." : "Documento pronto para análise"}</p>
              <p className="mt-1 text-xs text-foreground-muted">
                {leadSelecionado.documento_aprovacao_url ? "O lead já possui documento salvo." : "Existe um documento em edição pronto para ser enviado."}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {leadSelecionado.documento_aprovacao_url ? (
                  <a href={leadSelecionado.documento_aprovacao_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-success/30 bg-background-surface px-3 py-1.5 text-xs font-semibold text-success hover:bg-success/15">
                    Ver documento atual
                  </a>
                ) : null}
                <Button type="button" variant="outline" className="h-8 rounded-lg border-warning/30 text-xs font-semibold text-warning hover:bg-warning/10" disabled={uploadando} onClick={() => setMostrarTrocaDocumento(true)}>
                  Substituir documento
                </Button>
                {leadSelecionado.documento_aprovacao_url && (
                  <Button type="button" variant="outline" className="h-8 rounded-lg border-destructive/30 text-xs font-semibold text-destructive hover:bg-destructive/10" disabled={salvando} onClick={() => void onRemoverDocumento()}>
                    Remover documento
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border border-border p-3">
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant={modoDocumento === "arquivo" ? "default" : "outline"} className="h-9 rounded-lg" onClick={() => setModoDocumento("arquivo")}>Enviar PDF</Button>
                <Button type="button" variant={modoDocumento === "url" ? "default" : "outline"} className="h-9 rounded-lg" onClick={() => setModoDocumento("url")}>Informar URL</Button>
              </div>

              {modoDocumento === "arquivo" ? (
                <>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="block w-full rounded-xl border-2 border-dashed border-border p-3 text-sm text-foreground-muted"
                    onChange={(e) => {
                      const arquivo = e.target.files?.[0];
                      if (!arquivo) return;
                      const erroArquivo = validarArquivoDocumentoLead(arquivo);
                      if (erroArquivo) {
                        setErroDetalhesLead(erroArquivo);
                        return;
                      }
                      setArquivoSelecionado(arquivo);
                      setErroDetalhesLead(null);
                      setTemAlteracoes(true);
                    }}
                   />
                  {arquivoSelecionado ? (
                    <div className="rounded-xl border border-border bg-muted px-3 py-2 text-xs text-foreground-muted">
                      <p className="font-medium text-foreground">Arquivo pronto para envio</p>
                      <p className="mt-1 truncate">{arquivoSelecionado.name}</p>
                      <p>{tamanhoArquivoSelecionado}</p>
                    </div>
                  ) : null}
                    <ActionButton
                      type="button"
                      className="w-full rounded-xl bg-success hover:bg-success/90"
                      disabled={!arquivoSelecionado || uploadando || salvando}
                      loading={uploadando || salvando}
                      loadingText="Enviando documento..."
                      onClick={() => void onEnviarArquivo()}
                  >
                    Enviar documento
                  </ActionButton>
                </>
              ) : (
                <>
                  <Input
                    className="h-10 rounded-xl"
                    placeholder={MENSAGENS_KANBAN.placeholders.urlDocumento}
                    value={documentoAprovacaoUrl}
                    onChange={(e) => {
                      setDocumentoAprovacaoUrl(e.target.value);
                      setTemAlteracoes(true);
                      if (e.target.value) setArquivoSelecionado(null);
                    }}
                  />
                  {mensagemUrlDocumento ? (
                    <div className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs text-foreground">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{mensagemUrlDocumento}</span>
                    </div>
                  ) : null}
                    <ActionButton
                      type="button"
                      className="w-full rounded-xl bg-success hover:bg-success/90"
                      disabled={salvando || uploadando || !documentoAprovacaoUrl.trim() || Boolean(mensagemUrlDocumento)}
                      loading={salvando}
                      loadingText="Salvando URL..."
                      onClick={() => void onSalvarUrlDocumento()}
                  >
                    Salvar URL do documento
                  </ActionButton>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {erroDetalhesLead ? (
        <p className="rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive">
          <span className="inline-flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {erroDetalhesLead}
          </span>
        </p>
      ) : null}

      <div className="border-t pt-4">
        <Button variant="destructive" className="w-full rounded-xl text-sm font-medium" onClick={onExcluir} title="Abrir confirmacao de exclusao">
          <Trash2 className="mr-2 h-4 w-4" />
          Excluir Lead
        </Button>
      </div>
    </div>
  );
}
