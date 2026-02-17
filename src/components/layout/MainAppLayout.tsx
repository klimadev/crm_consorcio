'use client';

import type React from 'react';
import { MainSidebar } from './MainSidebar';
import { MainHeader } from './MainHeader';
import type { View } from './navigation';

interface MainAppLayoutProps {
  children: React.ReactNode;
  currentView: View;
  onViewChange: (view: View) => void;
  badge?: number;
  userName?: string;
  userRole?: string;
}

export function MainAppLayout({
  children,
  currentView,
  onViewChange,
  badge,
  userName,
  userRole,
}: MainAppLayoutProps) {
  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      <MainSidebar
        currentView={currentView}
        onViewChange={onViewChange}
        badge={badge}
        userName={userName}
        userRole={userRole}
      />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <MainHeader title={currentView} badge={badge} />
        <div className="flex-1 overflow-y-auto relative bg-slate-50">
          {children}
        </div>
      </main>
    </div>
  );
}
