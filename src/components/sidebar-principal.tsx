"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  LayoutGrid,
  Menu,
  Settings2,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { BotaoSair } from "@/components/botao-sair";
import { SessaoToken } from "@/lib/tipos";
import { DadosUsuarioLogado } from "@/lib/autenticacao";
import { cn } from "@/lib/utils";

type Props = {
  sessao: SessaoToken;
  dadosUsuario: DadosUsuarioLogado | null;
};

export function SidebarPrincipal({ sessao, dadosUsuario }: Props) {
  const pathname = usePathname();
  const [sidebarAberta, setSidebarAberta] = useState(false);

  const secoes = [
    {
      titulo: "GERAL",
      itens: [{ href: "/resumo", label: "Resumo", icon: BarChart3 }],
    },
    {
      titulo: "OPERACAO",
      itens: [
        { href: "/kanban", label: "Kanban", icon: LayoutGrid },
        { href: "/equipe", label: "Equipe", icon: Users },
      ],
    },
    {
      titulo: "SISTEMA",
      itens: [{ href: "/configs", label: "Configuracoes", icon: Settings2 }],
    },
  ];

  const iniciaisNome = dadosUsuario?.nome.slice(0, 2).toUpperCase() ?? sessao.perfil.slice(0, 2);

  const conteudoSidebar = (
    <div className="flex h-full flex-col gap-4 rounded-2xl border border-slate-200/80 bg-[#F8F9FA] p-4 shadow-[0_14px_40px_-28px_rgba(15,23,42,0.55)] lg:min-h-[calc(100vh-2rem)]">
      <div className="space-y-4">
        <div className="flex items-center gap-3 px-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[15px] font-semibold tracking-[-0.01em] text-slate-900">CRM Consorcio</p>
          </div>
        </div>
      </div>

      <nav className="space-y-5">
        {secoes.map((secao) => (
          <div key={secao.titulo} className="space-y-1.5">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
              {secao.titulo}
            </p>

            <div className="space-y-1">
              {secao.itens.map((item) => {
                const Icone = item.icon;
                const ativo = pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarAberta(false)}
                    className={cn(
                      "relative flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[14px] font-medium tracking-[-0.01em] text-slate-600 transition-all duration-200 hover:bg-[#F1F3F5] hover:text-slate-900",
                      ativo && "bg-blue-500/10 pl-4 text-blue-700 hover:bg-blue-500/15 hover:text-blue-700",
                    )}
                  >
                    {ativo ? <span className="absolute left-1 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-blue-600" /> : null}
                    <Icone className={cn("h-4 w-4", ativo && "text-blue-700")} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-sm font-semibold uppercase text-white">
            {iniciaisNome}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-medium tracking-[-0.01em] text-slate-900">
              {dadosUsuario?.nome ?? "Usuario"}
            </p>
            <p className="truncate text-xs uppercase tracking-wide text-slate-500">
              {dadosUsuario?.cargo ?? sessao.perfil}
            </p>
          </div>

          <BotaoSair apenasIcone className="h-9 w-9 rounded-lg" />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setSidebarAberta(true)}
        className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200 lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5 text-slate-600" />
      </button>

      <aside className="w-full lg:w-72 lg:shrink-0 lg:p-4">
        <div className="hidden lg:block">{conteudoSidebar}</div>

        {sidebarAberta && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setSidebarAberta(false)}
            />
            <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw] p-4">
              <button
                type="button"
                onClick={() => setSidebarAberta(false)}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200"
                aria-label="Fechar menu"
              >
                <X className="h-4 w-4 text-slate-600" />
              </button>
              {conteudoSidebar}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
