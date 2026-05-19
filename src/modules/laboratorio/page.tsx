"use client";

import { FlaskConical } from "lucide-react";
import { ModulePageShell } from "@/components/shared/module-page-shell";
import { ModulePageHeader } from "@/components/shared/module-page-header";
import { WhatsAppExporterPage } from "./whatsapp-exporter/page";

export function ModuloLaboratorio() {
  return (
    <ModulePageShell>
      <ModulePageHeader
        title="Laboratorio"
        subtitle="Ferramentas experimentais e em desenvolvimento"
        icon={<FlaskConical className="h-5 w-5" />}
        iconTone="amber"
      />

      <WhatsAppExporterPage />
    </ModulePageShell>
  );
}
