"use client";

import { Wallet } from "lucide-react";
import { ModulePageHeader } from "@/components/shared/module-page-header";
import { ModulePageShell } from "@/components/shared/module-page-shell";
import { FinanceiroTabs } from "./components/financeiro-tabs";
import { useFinanceiroDashboard } from "./hooks/use-financeiro-dashboard";

export function ModuloFinanceiro() {
  const vm = useFinanceiroDashboard();

  return (
    <ModulePageShell>
      <ModulePageHeader
        title="Financeiro"
        subtitle="Controle de parcelas e pagamentos"
        icon={<Wallet className="h-6 w-6" />}
        iconTone="emerald"
      />
      <FinanceiroTabs {...vm} />
    </ModulePageShell>
  );
}
