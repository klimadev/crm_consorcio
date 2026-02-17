'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import type React from 'react';
import { BRANDING } from '@/constants';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/leads', label: 'Leads' },
  { href: '/settings', label: 'Configuracoes' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data, status } = useSession({
    required: true,
  });

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-slate-600 text-sm">Carregando sessao...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">{BRANDING.companyName}</p>
            <h1 className="text-xl font-bold text-slate-900">{BRANDING.appName}</h1>
          </div>
          <nav className="flex items-center gap-2">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    active ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3 text-sm text-slate-700">
            <div className="text-right">
              <p className="font-semibold">{data?.user?.fullName ?? 'User'}</p>
              <p className="text-xs uppercase tracking-wide text-slate-500">{data?.user?.role ?? '-'}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-slate-700"
            >
              Sair
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">{children}</main>
    </div>
  );
}
