import { redirect } from "next/navigation";
import { AccessDeniedCard } from "@/components/shared/access-denied-card";
import { obterSessaoNoServidor } from "@/lib/autenticacao";
import { ModuloMinhasMetas } from "@/modules/equipe";

export default async function PaginaMinhasMetas() {
  const sessao = await obterSessaoNoServidor();

  if (!sessao) {
    redirect("/login");
  }

  if (sessao.perfil !== "COLABORADOR") {
    return (
      <AccessDeniedCard
        title="Sem permissao para acessar minhas metas"
        description="Esta visao e pensada para acompanhamento individual do colaborador. Use o painel de metas da equipe para a gestao completa."
      />
    );
  }

  return <ModuloMinhasMetas perfil={sessao.perfil} id_pdv={sessao.id_pdv} id_usuario={sessao.id_usuario} />;
}
