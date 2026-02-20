import { redirect } from "next/navigation";
import { obterSessaoNoServidor } from "@/lib/autenticacao";

export default async function Home() {
  const sessao = await obterSessaoNoServidor();

  if (sessao) {
    redirect("/resumo");
  }

  redirect("/login");
}
