import { redirect } from "next/navigation";
import { obterSessaoNoServidor } from "@/lib/autenticacao";

export default async function PaginaMinhasMetas() {
  const sessao = await obterSessaoNoServidor();

  if (!sessao) {
    redirect("/login");
  }

  redirect("/resumo");
}
