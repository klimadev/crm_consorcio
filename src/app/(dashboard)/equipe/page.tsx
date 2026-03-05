import { ModuloEquipe } from "@/modules/equipe";
import { obterSessaoNoServidor } from "@/lib/autenticacao";

export default async function PaginaEquipe() {
  const sessao = await obterSessaoNoServidor();

  if (!sessao) {
    return null;
  }

  return <ModuloEquipe perfil={sessao.perfil} id_pdv={sessao.id_pdv} />;
}
