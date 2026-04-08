import { obterSessaoNoServidor } from "@/lib/autenticacao";
import { ModuloResumo } from "@/modules/resumo";

export default async function PaginaResumo() {
  const sessao = await obterSessaoNoServidor();

  if (!sessao) {
    return null;
  }

  return <ModuloResumo perfil={sessao.perfil} idUsuario={sessao.id_usuario} idPdv={sessao.id_pdv} />;
}
