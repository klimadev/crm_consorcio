import { BarChart3 } from "lucide-react";
import { ModulePageHeader } from "@/components/shared/module-page-header";

export function ResumoHeader() {
  return <ModulePageHeader title="Resumo" subtitle="Panorama do funil, da equipe e dos gargalos operacionais." icon={<BarChart3 className="h-6 w-6" />} iconTone="emerald" />;
}
