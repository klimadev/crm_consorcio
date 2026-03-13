import { redirect } from "next/navigation";
import { AccessDeniedCard } from "@/components/shared/access-denied-card";
import { obterSessaoNoServidor } from "@/lib/autenticacao";
import { ModuloMetasEquipe } from "@/modules/equipe";

export default async function PaginaMetasEquipe() {
  const sessao = await obterSessaoNoServidor();

  if (!sessao) {
    redirect("/login");
  }

  if (sessao.perfil === "COLABORADOR") {
    return (
      <AccessDeniedCard
        title="Sem permissao para gerenciar metas"
        description="O painel de gestao de metas e exclusivo para administradores e gerentes do PDV."
      />
    );
  }

  return <ModuloMetasEquipe perfil={sessao.perfil} id_pdv={sessao.id_pdv} id_usuario={sessao.id_usuario} />;
}
