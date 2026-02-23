import { redirect } from "next/navigation";
import { SidebarPrincipal } from "@/components/sidebar-principal";
import {
  obterDadosUsuarioLogado,
  obterSessaoNoServidor,
} from "@/lib/autenticacao";

export default async function LayoutDashboard({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sessao = await obterSessaoNoServidor();

  if (!sessao) {
    redirect("/login");
  }

  const dadosUsuario = await obterDadosUsuarioLogado(sessao);

  return (
    <div className="min-h-screen lg:flex">
      <SidebarPrincipal sessao={sessao} dadosUsuario={dadosUsuario} />
      <main className="flex-1 p-4 lg:p-8">{children}</main>
    </div>
  );
}
