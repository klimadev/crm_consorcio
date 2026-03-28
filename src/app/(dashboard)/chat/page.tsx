import { ModuloChat } from "@/modules/chat";
import { obterSessaoNoServidor } from "@/lib/autenticacao";

export default async function PaginaChat() {
  const sessao = await obterSessaoNoServidor();

  if (!sessao) {
    return null;
  }

  return <ModuloChat />;
}
