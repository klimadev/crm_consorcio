import { redirect } from "next/navigation";
import { AccessDeniedCard } from "@/components/shared/access-denied-card";
import { obterSessaoNoServidor } from "@/lib/autenticacao";
import { MetasPage } from "@/modules/metas/metas-page";

export default async function PaginaMetasEquipe() {
  const sessao = await obterSessaoNoServidor();

  if (!sessao) {
    redirect("/login");
  }

  if (sessao.perfil === "COLABORADOR") {
    return (
      <AccessDeniedCard
        title="Sem permissão para gerenciar metas"
        description="O painel de gestão de metas é exclusivo para administradores e gerentes do PDV."
      />
    );
  }

  return <MetasPage perfil={sessao.perfil} id_pdv={sessao.id_pdv} modo="painel" />;
}
