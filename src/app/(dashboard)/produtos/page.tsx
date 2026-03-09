import { ModuloProdutos } from "@/modules/produtos";
import { obterSessaoNoServidor } from "@/lib/autenticacao";
import { podeVerEquipe } from "@/lib/permissoes";
import { redirect } from "next/navigation";

export default async function PaginaProdutos() {
  const sessao = await obterSessaoNoServidor();

  if (!sessao) {
    return null;
  }

  if (!podeVerEquipe(sessao)) {
    redirect("/kanban");
  }

  return <ModuloProdutos />;
}
