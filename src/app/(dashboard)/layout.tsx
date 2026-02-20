import { redirect } from "next/navigation";
import { SidebarPrincipal } from "@/components/sidebar-principal";
import { obterSessaoNoServidor } from "@/lib/autenticacao";

export default async function LayoutDashboard({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sessao = await obterSessaoNoServidor();

  if (!sessao) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen lg:flex">
      <SidebarPrincipal sessao={sessao} />
      <main className="flex-1 p-4 lg:p-8">{children}</main>
    </div>
  );
}
