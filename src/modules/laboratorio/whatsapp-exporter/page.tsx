"use client";

import { InstanciaSelector } from "./components/instancia-selector";
import { ExportConfigPanel } from "./components/export-config";
import { ResultadoDump } from "./components/resultado-dump";
import { useWhatsappExporter } from "./hooks/use-whatsapp-exporter";

export function WhatsAppExporterPage() {
  const vm = useWhatsappExporter();

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Selecione as instancias
          </h2>
          <p className="text-sm text-foreground-muted">
            Escolha uma ou mais instancias WhatsApp para exportar o historico de conversas.
          </p>
        </div>

        <InstanciaSelector
          instances={vm.instances}
          selectedIds={vm.selectedIds}
          onToggle={vm.toggleInstancia}
          carregando={vm.carregandoInstancias}
          erro={vm.erroCarregamento}
        />
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Configuracao da exportacao
          </h2>
          <p className="text-sm text-foreground-muted">
            Defina quantos chats e mensagens por chat deseja exportar.
          </p>
        </div>

        <ExportConfigPanel
          config={vm.config}
          onUpdate={vm.atualizarConfig}
          onExport={vm.exportar}
          loading={vm.loading}
          disabled={vm.selectedIds.length === 0}
        />

        {vm.selectedIds.length > 0 && (
          <p className="text-xs text-foreground-muted">
            {vm.selectedIds.length} instancia{vm.selectedIds.length > 1 ? "s" : ""} selecionada
            {vm.selectedIds.length > 1 ? "s" : ""}
          </p>
        )}
      </div>

      {vm.resultados.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">
            Resultados
          </h2>
          <div className="space-y-3">
            {vm.resultados.map((resultado, i) => (
              <ResultadoDump key={resultado.instanceId || i} resultado={resultado} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
