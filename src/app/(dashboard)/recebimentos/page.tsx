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
        title="Sem permissão para acessar Recebimentos"
        description="Este módulo é exclusivo do administrador da empresa. Gerentes continuam com acesso às parcelas pelo painel do lead no Kanban."
      />
    );
  }

  return <ModuloRecebimentos />;
}
