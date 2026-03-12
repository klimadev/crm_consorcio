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
      subtitle="Acompanhe o que entrou, o que vence e o que exige acao agora em toda a empresa."
      iconTone="emerald"
      icon={<WalletCards className="h-6 w-6" />}
      badges={[
        <Badge key="monitorados" className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
          {quantidadeMonitoradas} parcelas monitoradas
        </Badge>,
        temFiltrosAtivos ? (
          <Badge key="filtros" className="rounded-full border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50">
            filtros ativos
          </Badge>
        ) : (
          <Badge key="geral" className="rounded-full border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-50">
            visao geral da operacao
          </Badge>
        ),
      ]}
    />
  );
}
