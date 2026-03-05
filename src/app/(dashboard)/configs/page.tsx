import { ModuloConfigs } from "@/modules/configs";
import { obterSessaoNoServidor } from "@/lib/autenticacao";

export default async function PaginaConfigs() {
  const sessao = await obterSessaoNoServidor();

  if (!sessao) {
    return null;
  }

  if (sessao.perfil !== "EMPRESA" && sessao.perfil !== "GERENTE") {
    return <p className="text-sm text-sky-600">Acesso permitido apenas para perfil EMPRESA.</p>;
  }

  return <ModuloConfigs />;
}
