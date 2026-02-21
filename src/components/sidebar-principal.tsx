import Link from "next/link";
import { BarChart3, LayoutGrid, Settings2, Users } from "lucide-react";
import { BotaoSair } from "@/components/botao-sair";
import { SessaoToken } from "@/lib/tipos";

type Props = {
  sessao: SessaoToken;
};

export function SidebarPrincipal({ sessao }: Props) {
  const itens = [
    { href: "/resumo", label: "Resumo", icon: BarChart3 },
    { href: "/kanban", label: "Kanban", icon: LayoutGrid },
    { href: "/equipe", label: "Equipe", icon: Users },
    { href: "/configs", label: "Configuracoes", icon: Settings2 },
  ];

  return (
    <aside className="w-full border-b border-sky-200 bg-white p-4 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
      <div className="mb-4 flex items-center justify-between lg:mb-8">
        <p className="font-semibold">CRM Consorcio</p>
        <BotaoSair />
      </div>

      <p className="mb-3 text-xs uppercase text-sky-500">Perfil: {sessao.perfil}</p>

      <nav className="grid grid-cols-2 gap-2 lg:grid-cols-1">
        {itens.map((item) => {
          const Icone = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-md border border-sky-200 px-3 py-2 text-sm hover:bg-sky-50"
            >
              <Icone className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
