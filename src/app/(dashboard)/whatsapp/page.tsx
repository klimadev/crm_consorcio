import { ModuloWhatsapp } from "@/modules/whatsapp";
import { obterSessaoNoServidor } from "@/lib/autenticacao";
import { redirect } from "next/navigation";

export default async function PaginaWhatsapp() {
  const sessao = await obterSessaoNoServidor();

  if (!sessao) {
    redirect("/login");
  }

  if (sessao.perfil !== "EMPRESA" && sessao.perfil !== "GERENTE") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">Acesso restrito</h2>
          <p className="mt-2 text-sm text-foreground-muted">
            Este módulo está disponível apenas para o administrador da empresa.
          </p>
        </div>
      </div>
    );
  }

  return <ModuloWhatsapp />;
}
