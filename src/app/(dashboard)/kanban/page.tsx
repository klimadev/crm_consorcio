import { ModuloKanban } from "@/components/modulo-kanban";
import { obterSessaoNoServidor } from "@/lib/autenticacao";

export default async function PaginaKanban() {
  const sessao = await obterSessaoNoServidor();

  if (!sessao) {
    return null;
  }

  return <ModuloKanban perfil={sessao.perfil} idUsuario={sessao.id_usuario} />;
}
