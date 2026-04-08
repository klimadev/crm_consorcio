"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import {
  BarChart3,
  WalletCards,
  LayoutGrid,
  Menu,
  MessageSquare,
  Settings2,
  Target,
  Users,
  X,
  MessageCircle,
  ChevronDown,
} from "lucide-react";
import { BotaoSair } from "@/components/botao-sair";
import { SessaoToken } from "@/lib/tipos";
import { DadosUsuarioLogado } from "@/lib/autenticacao";
import { cn } from "@/lib/utils";
import { usePendenciasGlobais } from "@/modules/kanban/hooks/use-pendencias-globais";
import { TOUR_TARGETS } from "@/modules/onboarding/lib/selectors";

type ItemMenu = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tourTarget?: string;
  children?: ItemMenu[];
  badge?: string;
};

type Props = {
  sessao: SessaoToken;
  dadosUsuario: DadosUsuarioLogado | null;
};

const SIGLA_PERFIL: Record<SessaoToken["perfil"], string> = {
  EMPRESA: "ADM",
  GERENTE: "GTE",
  COLABORADOR: "CLB",
};

const LABEL_PERFIL: Record<SessaoToken["perfil"], string> = {
  EMPRESA: "Administrador",
  GERENTE: "Gerente",
  COLABORADOR: "Colaborador",
};

function gerarIniciais(nome: string | undefined, perfil: SessaoToken["perfil"]) {
  const nomeTratado = nome?.trim();
  if (!nomeTratado) return SIGLA_PERFIL[perfil];

  const partesNome = nomeTratado.split(/\s+/).filter(Boolean);
  if (partesNome.length === 1) {
    return partesNome[0].slice(0, 2).toUpperCase();
  }

  return `${partesNome[0][0] ?? ""}${partesNome[partesNome.length - 1][0] ?? ""}`.toUpperCase();
}

function MenuItemComBadge({
  href,
  label,
  icon: Icone,
  ativo,
  resumo,
  onClick,
  tourTarget,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  ativo: boolean;
  resumo?: { total: number; porGravidade: Record<string, number> } | null;
  onClick?: () => void;
  tourTarget?: string;
}) {
  const temPendenciaCritica = resumo?.porGravidade.critica && resumo.porGravidade.critica > 0;
  const temPendencia = resumo && resumo.total > 0;

  return (
    <Link
      href={href}
      onClick={onClick}
      data-tour={tourTarget}
      className={cn(
        "relative flex items-center justify-between rounded-[10px] px-3 py-2.5 text-[14px] font-medium tracking-[-0.01em] text-foreground-muted transition-all duration-200 hover:bg-muted hover:text-foreground",
        ativo && "bg-muted pl-4 text-foreground",
      )}
    >
      <div className="flex items-center gap-2.5">
        {ativo ? <span className="absolute left-1 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-background" /> : null}
        <Icone className={cn("h-4 w-4", ativo ? "text-foreground" : "text-foreground-muted")} />
        {label}
      </div>
      {temPendencia && (
            <span
              className={cn(
                "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold text-white",
                temPendenciaCritica ? "bg-destructive" : "bg-warning",
              )}
        >
          {resumo.total > 99 ? "99+" : resumo.total}
        </span>
      )}
    </Link>
  );
}

export function SidebarPrincipal({ sessao, dadosUsuario }: Props) {
  const pathname = usePathname();
  const baseSubmenuId = useId();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [sidebarAberta, setSidebarAberta] = useState(false);
  const [submenuAberto, setSubmenuAberto] = useState<string | null>(
    pathname.startsWith("/equipe") ? "/equipe" : null
  );
  const { resumo } = usePendenciasGlobais();

  const toggleSubmenu = (href: string) => {
    setSubmenuAberto(submenuAberto === href ? null : href);
  };

  type Secao = {
  titulo: string;
  itens: ItemMenu[];
};

const secoes: Secao[] = [
    {
      titulo: "GERAL",
      itens: [{ href: "/resumo", label: "Resumo", icon: BarChart3, tourTarget: TOUR_TARGETS.sidebarResumo }],
    },
    {
      titulo: "OPERAÇÃO",
      itens: [
        { href: "/chat", label: "Chat", icon: MessageSquare, badge: "Beta" },
        { href: "/kanban", label: "Leads", icon: LayoutGrid, tourTarget: TOUR_TARGETS.sidebarKanban },
        ...(sessao.perfil === "EMPRESA" ? [{ href: "/recebimentos", label: "Recebimentos", icon: WalletCards }] : []),
        // [HYPE CRM] Feature em desenvolvimento - Produtos será uma feature exclusiva do HYPE CRM
        // ...(sessao.perfil === "EMPRESA" || sessao.perfil === "GERENTE"
        //   ? [{ href: "/produtos", label: "Produtos", icon: Package }]
        //   : []),
        ...(sessao.perfil !== "COLABORADOR"
          ? [
              {
                href: "/equipe",
                label: "Equipe",
                icon: Users,
                tourTarget: TOUR_TARGETS.sidebarEquipe,
                children: [
                  { href: "/equipe/metas", label: "Metas", icon: Target },
                ],
              },
            ]
          : []),
      ],
    },
    {
      titulo: "SISTEMA",
      itens: [
        ...(sessao.perfil === "EMPRESA" || sessao.perfil === "GERENTE"
          ? [{ href: "/whatsapp", label: "WhatsApp", icon: MessageCircle, tourTarget: TOUR_TARGETS.sidebarWhatsapp }]
          : []),
        ...(sessao.perfil === "EMPRESA"
          ? [{ href: "/configs", label: "Configurações", icon: Settings2, tourTarget: TOUR_TARGETS.sidebarConfigs }]
          : []),
      ],
    },
  ];

  const nomeExibicao = dadosUsuario?.nome?.trim() || "Sem nome";
  const cargoExibicao = dadosUsuario?.cargo?.trim() || LABEL_PERFIL[sessao.perfil];
  const iniciaisNome = gerarIniciais(dadosUsuario?.nome, sessao.perfil);

  useEffect(() => {
    if (!sidebarAberta) return;

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSidebarAberta(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [sidebarAberta]);

  const conteudoSidebar = (
    <div className="flex h-full flex-col gap-4 rounded-2xl border border-border bg-background p-4 shadow-sm shadow-black/10 lg:min-h-full lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
        <div className="space-y-4">
        <div className="flex items-center gap-3 px-1">
          <div className="relative h-9 w-9 overflow-hidden rounded-xl">
            <Image
              src="/logo.png"
              alt="MC Consórcio"
              fill
              className="object-cover"
            />
          </div>
          <div>
            <p className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">MC CRM Consórcio</p>
          </div>
        </div>
      </div>

      <nav className="space-y-5">
        {secoes.map((secao) => (
          <div key={secao.titulo} className="space-y-1.5">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground-muted">
              {secao.titulo}
            </p>

            <div className="space-y-1">
              {secao.itens.map((item) => {
                const Icone = item.icon;
                const ativo = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const temChildren = item.children && item.children.length > 0;
                const isSubmenuOpen = temChildren && submenuAberto === item.href;

                if (item.href === "/kanban") {
                  return (
                    <MenuItemComBadge
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      icon={Icone}
                      ativo={ativo}
                      resumo={resumo ?? undefined}
                      tourTarget={item.tourTarget}
                      onClick={() => setSidebarAberta(false)}
                      />
                  );
                }

                // Item com submenu (ex: Equipe)
                if (temChildren) {
                  const submenuId = `${baseSubmenuId}-${item.href.replace(/\//g, "-")}`;

                  return (
                    <div key={item.href}>
                      <div
                        className={cn(
                          "relative flex w-full items-center justify-between rounded-[10px] px-3 py-2.5 text-[14px] font-medium tracking-[-0.01em] text-foreground-muted transition-all duration-200 hover:bg-muted hover:text-foreground",
                          ativo && "bg-muted pl-4 text-foreground",
                        )}
                      >
                        <Link
                          href={item.href}
                          onClick={() => setSidebarAberta(false)}
                          data-tour={item.tourTarget}
                          className="flex flex-1 items-center gap-2.5"
                        >
                          {ativo ? <span className="absolute left-1 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-background" /> : null}
                          <Icone className={cn("h-4 w-4", ativo ? "text-white" : "text-blue-100")} />
                          {item.label}
                        </Link>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            toggleSubmenu(item.href);
                          }}
                          className="p-1"
                          aria-label={isSubmenuOpen ? `Fechar submenu de ${item.label}` : `Abrir submenu de ${item.label}`}
                          aria-expanded={isSubmenuOpen}
                          aria-controls={submenuId}
                        >
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 text-foreground-muted transition-transform duration-200",
                              isSubmenuOpen && "rotate-180",
                            )}
                          />
                        </button>
                      </div>

                      {/* Sub-itens */}
                      {isSubmenuOpen && (
                          <div id={submenuId} className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-3">
                          {item.children!.map((child) => {
                            const ChildIcon = child.icon;
                            const childAtivo = pathname === child.href || pathname.startsWith(`${child.href}/`);
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                onClick={() => setSidebarAberta(false)}
                                className={cn(
                                  "relative flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] font-medium tracking-[-0.01em] transition-all duration-200",
                                  childAtivo
                                   ? "bg-muted text-foreground"
                                   : "text-foreground-muted hover:bg-muted hover:text-foreground",
                                )}
                              >
                                 <ChildIcon className={cn("h-3.5 w-3.5", childAtivo ? "text-foreground" : "text-foreground-muted")} />
                                {child.label}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                // Item normal sem submenu
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarAberta(false)}
                    data-tour={item.tourTarget}
                    className={cn(
                      "relative flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[14px] font-medium tracking-[-0.01em] text-foreground-muted transition-all duration-200 hover:bg-muted hover:text-foreground",
                      ativo && "bg-muted pl-4 text-foreground",
                    )}
                  >
                    {ativo ? <span className="absolute left-1 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-background" /> : null}
                    <Icone className={cn("h-4 w-4", ativo ? "text-foreground" : "text-foreground-muted")} />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="rounded-full bg-warning px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none text-warning-foreground">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto rounded-2xl border border-border bg-background-elevated p-3 shadow-sm shadow-black/10 backdrop-blur-sm lg:rounded-xl lg:border-border/70 lg:bg-muted/30 lg:shadow-none">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold uppercase text-foreground">
            {iniciaisNome}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-medium tracking-[-0.01em] text-foreground">
              {nomeExibicao}
            </p>
            <div className="flex items-center gap-2">
              <p className="truncate text-xs uppercase tracking-wide text-foreground-muted">{cargoExibicao}</p>
      <span className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                {SIGLA_PERFIL[sessao.perfil]}
              </span>
            </div>
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
        className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-lg bg-background-surface shadow-sm ring-1 ring-border lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5 text-foreground" />
      </button>

      <aside className="w-full lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0 lg:self-start lg:border-r lg:border-border/80 lg:px-3 lg:py-4">
        <div className="hidden lg:block">{conteudoSidebar}</div>

        {sidebarAberta && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setSidebarAberta(false)}
            />
            <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw] p-4" role="dialog" aria-modal="true" aria-label="Menu principal">
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setSidebarAberta(false)}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg bg-background-surface shadow-sm ring-1 ring-border"
                aria-label="Fechar menu"
              >
                <X className="h-4 w-4 text-foreground" />
              </button>
              {conteudoSidebar}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
