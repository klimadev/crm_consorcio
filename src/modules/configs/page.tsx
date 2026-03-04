"use client";

import { useConfigsModule } from "./hooks/use-configs-module";
import { ConfigsHeader } from "./components/configs-header";
import { ConfigsErrorAlert } from "./components/configs-error-alert";

export function ModuloConfigs() {
  const vm = useConfigsModule();

  return (
    <section className="space-y-5 rounded-2xl bg-slate-50/50 p-4 pb-6 md:p-6">
      <ConfigsHeader />
      <ConfigsErrorAlert erro={vm.erro} />
    </section>
  );
}
