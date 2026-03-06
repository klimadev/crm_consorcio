import { AlertCircle, FileText, Loader2, Phone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { aplicaMascaraMoedaBr, aplicaMascaraTelefoneBr, converteMoedaBrParaNumero } from "@/lib/utils";
import type { Estagio, Funcionario, Lead, PendenciaDinamica } from "../types";

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
  onAprovarLead: () => Promise<void>;
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
    onAprovarLead,
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

  const statusLead = temPendenciaDocumento
    ? { rotulo: "Pendência crítica", descricao: "Documento de aprovação pendente. Não pode avançar para Fechado.", classe: "border-rose-300 bg-rose-50 text-rose-800" }
    : emAnalise
      ? { rotulo: "Pendência de análise", descricao: "Aguardando análise/aprovação da EMPRESA para liberar Fechado.", classe: "border-amber-300 bg-amber-50 text-amber-800" }
      : leadSelecionado.aprovado_em
        ? { rotulo: "Aprovado", descricao: "Lead apto para avançar para Fechado.", classe: "border-emerald-300 bg-emerald-50 text-emerald-800" }
        : { rotulo: "Em andamento", descricao: "Siga preenchendo os dados e conduzindo o lead no funil.", classe: "border-slate-300 bg-slate-50 text-slate-700" };

  return (
    <div className="space-y-4 p-4">
      <div className={`rounded-xl border p-4 ${statusLead.classe}`}>
        <p className="text-sm font-semibold">Status atual: {statusLead.rotulo}</p>
        <p className="mt-1 text-xs">{statusLead.descricao}</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-slate-800">Dados editáveis</p>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Phone className="h-4 w-4 text-emerald-600" />
            Telefone
          </label>
          <Input
            className="h-11 rounded-xl border-slate-200"
            value={leadSelecionado.telefone}
            onChange={(e) => onMudarLead({ ...leadSelecionado, telefone: aplicaMascaraTelefoneBr(e.target.value) })}
          />
        </div>

        <div className="mt-3 space-y-2">
          <label className="text-sm font-medium text-slate-700">Valor do Consórcio</label>
          <Input
            className="h-11 rounded-xl border-slate-200"
            inputMode="numeric"
            value={aplicaMascaraMoedaBr(String(Math.round(leadSelecionado.valor_consorcio * 100)))}
            onChange={(e) => onMudarLead({ ...leadSelecionado, valor_consorcio: converteMoedaBrParaNumero(e.target.value) })}
          />
        </div>

        <div className="mt-3 space-y-2">
          <label className="text-sm font-medium text-slate-700">Observações</label>
          <Textarea
            className="min-h-[100px] rounded-xl border-slate-200"
            value={leadSelecionado.observacoes ?? ""}
            onChange={(e) => onMudarLead({ ...leadSelecionado, observacoes: e.target.value })}
          />
        </div>

        {perfil !== "COLABORADOR" ? (
          <div className="mt-3 space-y-2">
            <label className="text-sm font-medium text-slate-700">Responsavel</label>
            <Select value={leadSelecionado.id_funcionario} onValueChange={(id_funcionario) => onMudarLead({ ...leadSelecionado, id_funcionario })}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200">
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

        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <FileText className="h-4 w-4 text-emerald-600" />
            Documento de Aprovação
          </label>

          {temDocumentoEmEdicao && !mostrarTrocaDocumento ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm font-semibold text-emerald-800">{uploadando ? "Enviando documento..." : "Documento enviado com sucesso"}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {leadSelecionado.documento_aprovacao_url ? (
                  <a href={leadSelecionado.documento_aprovacao_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                    Ver documento atual
                  </a>
                ) : null}
                <Button type="button" variant="outline" className="h-8 rounded-lg border-amber-300 text-xs font-semibold text-amber-700 hover:bg-amber-50" disabled={uploadando} onClick={() => setMostrarTrocaDocumento(true)}>
                  Substituir documento
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border border-slate-200 p-3">
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant={modoDocumento === "arquivo" ? "default" : "outline"} className="h-9 rounded-lg" onClick={() => setModoDocumento("arquivo")}>Enviar PDF</Button>
                <Button type="button" variant={modoDocumento === "url" ? "default" : "outline"} className="h-9 rounded-lg" onClick={() => setModoDocumento("url")}>Informar URL</Button>
              </div>

              {modoDocumento === "arquivo" ? (
                <>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="block w-full rounded-xl border-2 border-dashed border-slate-200 p-3 text-sm text-slate-500"
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
                  <Button type="button" className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700" disabled={!arquivoSelecionado || uploadando || salvando} onClick={() => void onEnviarArquivo()}>
                    {uploadando || salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar documento"}
                  </Button>
                </>
              ) : (
                <>
                  <Input
                    className="h-10 rounded-xl border-slate-200"
                    placeholder="https://..."
                    value={documentoAprovacaoUrl}
                    onChange={(e) => {
                      setDocumentoAprovacaoUrl(e.target.value);
                      setTemAlteracoes(true);
                      if (e.target.value) setArquivoSelecionado(null);
                    }}
                  />
                  <Button type="button" className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700" disabled={salvando || uploadando || !documentoAprovacaoUrl.trim()} onClick={() => void onSalvarUrlDocumento()}>
                    {salvando ? "Salvando URL..." : "Salvar URL do documento"}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {emPreAprovacao && leadSelecionado.documento_aprovacao_url && !leadSelecionado.aprovado_em && perfil !== "COLABORADOR" ? (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 shadow-sm">
          <p className="mb-2 text-sm font-semibold text-amber-800">Pendência de análise da EMPRESA (Pré Aprovação)</p>
          <Button className="w-full rounded-xl bg-amber-500 font-medium text-white hover:bg-amber-600" onClick={() => void onAprovarLead()} disabled={aprovando}>
            {aprovando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aprovar Lead"}
          </Button>
        </div>
      ) : null}

      {leadSelecionado.aprovado_em ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <p className="font-semibold">Lead aprovado</p>
          <p className="mt-1 text-xs">Aprovado em {formatarDataBrUtc(leadSelecionado.aprovado_em)}</p>
        </div>
      ) : null}

      {pendenciasLead.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">Pendências e próximos passos</p>
          {pendenciasLead.map((pendencia) => (
            <div key={pendencia.id} className="rounded-xl border border-amber-200/70 bg-amber-50/60 p-3">
              <p className="text-sm font-semibold text-slate-700">{LABELS_PENDENCIA[pendencia.tipo] || pendencia.tipo}</p>
              <p className="text-xs text-slate-500">{pendencia.descricao}</p>
            </div>
          ))}
        </div>
      ) : null}

      {erroDetalhesLead ? (
        <p className="rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-600">
          <span className="inline-flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {erroDetalhesLead}
          </span>
        </p>
      ) : null}

      {hasChanges ? (
        <Button className="w-full rounded-xl bg-emerald-600 text-sm font-medium hover:bg-emerald-700" onClick={() => void onSalvar()} disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar Alterações"}
        </Button>
      ) : null}

      <div className="border-t pt-4">
        <Button variant="destructive" className="w-full rounded-xl text-sm font-medium" onClick={onExcluir}>
          <Trash2 className="mr-2 h-4 w-4" />
          Excluir Lead
        </Button>
      </div>
    </div>
  );
}
