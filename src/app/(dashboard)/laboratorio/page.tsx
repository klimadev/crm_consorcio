import { ModuloLaboratorio } from "@/modules/laboratorio";
import { obterSessaoNoServidor } from "@/lib/autenticacao";
import { redirect } from "next/navigation";

export default async function PaginaLaboratorio() {
  const sessao = await obterSessaoNoServidor();

  if (!sessao) {
    redirect("/login");
  }

  return <ModuloLaboratorio />;
}
