import { redirect } from "next/navigation";
import { ModuloRecebimentos } from "@/modules/recebimentos";
import { obterSessaoNoServidor } from "@/lib/autenticacao";
import { AccessDeniedCard } from "@/components/shared/access-denied-card";

export default async function PaginaRecebimentos() {
  const sessao = await obterSessaoNoServidor();

  if (!sessao) {
    redirect("/login");
  }

  if (sessao.perfil !== "EMPRESA") {
    return (
      <AccessDeniedCard
        title="Sem permissao para acessar recebimentos"
        description="Este modulo consolidado e exclusivo do administrador da empresa. Gerentes continuam com acesso as parcelas diretamente pelo drawer do lead."
      />
    );
  }

  return <ModuloRecebimentos />;
}
