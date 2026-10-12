import { WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ModulePageHeader } from "@/components/shared/module-page-header";

type RecebimentosHeaderProps = {
  quantidadeMonitoradas: number;
  temFiltrosAtivos: boolean;
};

export function RecebimentosHeader({ quantidadeMonitoradas, temFiltrosAtivos }: RecebimentosHeaderProps) {
  return (
    <ModulePageHeader
      title="Recebimentos"
      subtitle="Acompanhe o que entrou, o que vence e o que exige ação agora em toda a empresa."
      iconTone="emerald"
      icon={<WalletCards className="h-6 w-6" />}
      badges={[
        <Badge key="monitorados" className="rounded-full border-success/25 bg-success/10 text-success hover:bg-success/10">
          {quantidadeMonitoradas} parcelas monitoradas
        </Badge>,
        temFiltrosAtivos ? (
          <Badge key="filtros" className="rounded-full border-warning/25 bg-warning/10 text-warning hover:bg-warning/10">
            filtros ativos
          </Badge>
        ) : (
          <Badge key="geral" className="rounded-full border-info/25 bg-info/10 text-info hover:bg-info/10">
            visão geral da operação
          </Badge>
        ),
      ]}
    />
  );
}
