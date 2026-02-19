'use client';

import { signOut } from 'next-auth/react';
import { BRANDING } from '@/constants';
import { NAV_ITEMS, type View } from './navigation';

interface MainSidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  userName?: string;
  userRole?: string;
}

export function MainSidebar({
  currentView,
  onViewChange,
  userName = 'Usuario',
  userRole = '-',
}: MainSidebarProps) {
  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0 z-20 text-white shadow-xl">
      <div className="p-6 flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
          <span className="text-white font-bold text-sm tracking-tighter">{BRANDING.logoInitials}</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white">{BRANDING.appName}</h1>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.view}
            // TODO(nav): Prefer router navigation for all items; fallback to onViewChange requires non-noop handlers in route pages.
            onClick={() => item.href ? window.location.href = item.href : onViewChange(item.view)}
            className={`flex items-center gap-3 w-full px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group ${
              currentView === item.view
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <item.icon size={20} className={currentView === item.view ? 'text-white' : 'text-slate-500 group-hover:text-white'} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 relative">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full bg-slate-800/50 hover:bg-slate-800 rounded-xl p-3 border border-slate-700/50 flex items-center justify-between transition-colors text-left"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex flex-shrink-0 items-center justify-center text-xs font-bold text-white">
              {userName?.charAt(0) ?? '?'}
            </div>
            <div className="overflow-hidden text-left">
              <p className="text-sm font-medium text-white truncate">{userName}</p>
              <p className="text-[10px] text-slate-400 truncate uppercase font-bold">{userRole}</p>
            </div>
          </div>
        </button>
      </div>
    </aside>
  );
}
