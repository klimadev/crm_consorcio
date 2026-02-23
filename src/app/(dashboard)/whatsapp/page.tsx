import { ModuloWhatsapp } from "@/components/modulo-whatsapp";
import { obterSessaoNoServidor } from "@/lib/autenticacao";
import { redirect } from "next/navigation";

export default async function PaginaWhatsapp() {
  const sessao = await obterSessaoNoServidor();

  if (!sessao) {
    redirect("/login");
  }

  if (sessao.perfil !== "EMPRESA") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800">Acesso restrito</h2>
          <p className="mt-2 text-sm text-slate-500">
            Este módulo está disponível apenas para o administrador da empresa.
          </p>
        </div>
      </div>
    );
  }

  return <ModuloWhatsapp />;
}
