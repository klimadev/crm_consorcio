"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ChevronDown, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";

type ProviderConfig = {
  base_url: string;
  api_key: string;
  model: string;
  enabled: boolean;
};

type Props = {
  config: ProviderConfig | null;
  onSave: (config: ProviderConfig) => Promise<void>;
  onTest: (config: ProviderConfig) => Promise<boolean>;
  onListModels: (baseUrl: string, apiKey: string) => Promise<string[]>;
  loading?: boolean;
};

export function ProviderConfigSection({
  config,
  onSave,
  onTest,
  onListModels,
  loading: externalLoading,
}: Props) {
  const [aberto, setAberto] = useState(false);
  const [baseUrl, setBaseUrl] = useState(config?.base_url ?? "https://api.openai.com/v1");
  const [apiKey, setApiKey] = useState(config?.api_key ?? "");
  const [model, setModel] = useState(config?.model ?? "gpt-4o");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [listing, setListing] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [models, setModels] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const configured = config?.enabled ?? false;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave({ base_url: baseUrl, api_key: apiKey, model, enabled: true });
      setTestResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setError(null);
    try {
      const ok = await onTest({ base_url: baseUrl, api_key: apiKey, model, enabled: true });
      setTestResult(ok);
    } catch (e) {
      setTestResult(false);
      setError(e instanceof Error ? e.message : "Erro ao testar");
    } finally {
      setTesting(false);
    }
  };

  const handleListModels = async () => {
    setListing(true);
    setError(null);
    try {
      const result = await onListModels(baseUrl, apiKey);
      setModels(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao listar modelos");
      setModels([]);
    } finally {
      setListing(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-background-surface">
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          {aberto ? (
            <ChevronDown className="h-4 w-4 text-foreground-muted" />
          ) : (
            <ChevronRight className="h-4 w-4 text-foreground-muted" />
          )}
          <span className="text-sm font-semibold text-foreground">
            Configuração do Provedor IA
          </span>
          {configured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              Provedor configurado: {config?.model}
            </span>
          )}
          {!configured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
              <AlertCircle className="h-3 w-3" />
              Provedor não configurado
            </span>
          )}
        </div>
      </button>

      {aberto && (
        <div className="space-y-4 border-t border-border px-4 pb-4 pt-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground-muted">Base URL</label>
            <Input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground-muted">API Key</label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={config?.api_key ? "••••••••" : "sk-..."}
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground-muted">Modelo</label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gpt-4o"
                className="h-9 flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleListModels}
                disabled={listing || !baseUrl || !apiKey}
                className="h-9 shrink-0"
              >
                {listing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Consultar Modelos"
                )}
              </Button>
            </div>
            {models && models.length > 0 && (
              <div className="mt-2 flex max-h-32 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-border bg-muted/20 p-2">
                {models.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setModel(m)}
                    className="rounded-md border border-border bg-background-surface px-2 py-0.5 text-xs text-foreground-muted hover:border-emerald-500/30 hover:text-foreground transition-colors"
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
            {models && models.length === 0 && (
              <p className="text-xs text-foreground-muted mt-1">
                Nao foi possivel listar modelos — use o campo manual.
              </p>
            )}
          </div>

          {error && (
            <p className="text-xs text-rose-400">{error}</p>
          )}

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={testing || !baseUrl || !apiKey || !model}
              className="h-9"
            >
              {testing ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : null}
              Testar Conexão
            </Button>

            {testResult === true && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Conexão OK
              </span>
            )}
            {testResult === false && (
              <span className="inline-flex items-center gap-1 text-xs text-rose-400">
                <AlertCircle className="h-3.5 w-3.5" />
                Falha na conexão
              </span>
            )}

            <div className="flex-1" />

            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving || !baseUrl || !model || !apiKey}
              className="h-9"
            >
              {saving ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : null}
              Salvar Configuração
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
