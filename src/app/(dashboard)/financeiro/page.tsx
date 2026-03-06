import { obterSessaoNoServidor } from "@/lib/autenticacao";
import { ModuloFinanceiro } from "@/modules/financeiro";

export default async function PaginaFinanceiro() {
  const sessao = await obterSessaoNoServidor();
  if (!sessao) {
    return null;
  }

  return <ModuloFinanceiro />;
}
