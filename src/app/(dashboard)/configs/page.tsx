import { ModuloConfigs } from "@/components/modulo-configs";
import { obterSessaoNoServidor } from "@/lib/autenticacao";

export default async function PaginaConfigs() {
  const sessao = await obterSessaoNoServidor();

  if (!sessao) {
    return null;
  }

  if (sessao.perfil !== "EMPRESA") {
    return <p className="text-sm text-slate-600">Acesso permitido apenas para perfil EMPRESA.</p>;
  }

  return <ModuloConfigs />;
}
