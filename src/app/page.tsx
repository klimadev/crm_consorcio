'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CRMProvider, useCRM } from '@/context';
import { KanbanBoard, DashboardBI, SalesEngine, OrganizationView, EmployeesView, ProductsView, CustomersView, IntegrationsView, NoSSR } from '@/components';
import { 
  LayoutDashboard, Users, Package, Bell, Briefcase, Map, ChevronDown, PieChart, Plug, FileText 
} from 'lucide-react';
import { BRANDING } from '@/constants';

type View = 'dashboard' | 'kanban' | 'sales_engine' | 'organization' | 'employees' | 'products' | 'customers' | 'integrations';

const NavItem = ({ view, icon: Icon, label, currentView, setCurrentView }: { view: View; icon: any; label: string; currentView: View; setCurrentView: (v: View) => void }) => (
  <button
    onClick={() => setCurrentView(view)}
    className={`flex items-center gap-3 w-full px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group ${
      currentView === view 
        ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    <Icon size={20} className={currentView === view ? 'text-white' : 'text-slate-500 group-hover:text-white'} />
    {label}
  </button>
);

const InnerApp: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('kanban');
  const [mounted, setMounted] = useState(false);
  const { currentUser, employees, setCurrentUser, deals, stages, isAuthResolved } = useCRM();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (isAuthResolved && !currentUser) {
      router.replace('/login');
    }
  }, [mounted, isAuthResolved, currentUser, router]);

  if (!mounted || !isAuthResolved || !currentUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-slate-400">Carregando...</div>
      </div>
    );
  }

  const overdueDeals = (deals || []).filter(d => {
    if (!d.nextFollowUpDate) return false;
    const stage = (stages || []).find(s => s.id === d.stageId);
    const isClosed = stage?.type === 'WON' || stage?.type === 'LOST';
    const dealDate = new Date(d.nextFollowUpDate);
    const now = new Date();
    return dealDate < now && !isClosed;
  });

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0 z-20 text-white shadow-xl">
        <div className="p-6 flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-white font-bold text-sm tracking-tighter">{BRANDING.logoInitials}</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">{BRANDING.appName}</h1>
        </div>
        
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          <div className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-widest">Gestão</div>
          <NavItem view="dashboard" icon={PieChart} label="Dashboard" currentView={currentView} setCurrentView={setCurrentView} />
          
          <div className="px-4 py-2 mt-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Vendas & Operação</div>
          <NavItem view="kanban" icon={LayoutDashboard} label="Funil (Kanban)" currentView={currentView} setCurrentView={setCurrentView} />
          <NavItem view="sales_engine" icon={FileText} label="Motor de Propostas" currentView={currentView} setCurrentView={setCurrentView} />
          <NavItem view="customers" icon={Briefcase} label="Clientes" currentView={currentView} setCurrentView={setCurrentView} />
          
          <div className="px-4 py-2 mt-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Configuração</div>
          {currentUser.role === 'ADMIN' && (
             <>
               <NavItem view="organization" icon={Map} label="Organização" currentView={currentView} setCurrentView={setCurrentView} />
               <NavItem view="employees" icon={Users} label="Equipe" currentView={currentView} setCurrentView={setCurrentView} />
               <NavItem view="products" icon={Package} label="Produtos" currentView={currentView} setCurrentView={setCurrentView} />
               <NavItem view="integrations" icon={Plug} label="Integrações" currentView={currentView} setCurrentView={setCurrentView} />
             </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800 relative">
           <button 
             onClick={() => setShowUserMenu(!showUserMenu)}
             className="w-full bg-slate-800/50 hover:bg-slate-800 rounded-xl p-3 border border-slate-700/50 flex items-center justify-between transition-colors"
           >
             <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex flex-shrink-0 items-center justify-center text-xs font-bold text-white">
                  {currentUser?.name?.charAt(0) ?? '?'}
                </div>
                <div className="overflow-hidden text-left">
                  <p className="text-sm font-medium text-white truncate">{currentUser?.name ?? 'Usuario'}</p>
                  <p className="text-[10px] text-slate-400 truncate uppercase font-bold">{currentUser.role}</p>
                </div>
             </div>
             <ChevronDown size={14} className="text-slate-500" />
           </button>
            {showUserMenu && (
              <div className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden py-1 z-50">
                {(employees || []).map(e => (
                    <button key={e.id} onClick={() => { setCurrentUser(e); setShowUserMenu(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 ${currentUser.id === e.id ? 'font-bold text-blue-600 bg-blue-50' : 'text-slate-600'}`}>{e.name}</button>
                ))}
              </div>
            )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 flex-shrink-0 z-10 shadow-sm">
           <h2 className="text-xl font-bold text-slate-800 capitalize">{currentView.replace('_', ' ')}</h2>
           <div className="flex items-center gap-5">
              <button className="relative p-2 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                 <Bell size={20} />
                 {overdueDeals.length > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white">{overdueDeals.length}</span>}
              </button>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto relative bg-slate-50">
          {currentView === 'dashboard' && <DashboardBI />}
          {currentView === 'kanban' && <KanbanBoard />}
          {currentView === 'sales_engine' && <SalesEngine />}
          
          {currentView === 'organization' && <OrganizationView />}
          {currentView === 'employees' && <EmployeesView />}
          {currentView === 'products' && <ProductsView />}
          {currentView === 'customers' && <CustomersView />}
          {currentView === 'integrations' && <IntegrationsView />}
        </div>
      </main>
    </div>
  );
};

// Create a client
const queryClient = new QueryClient();

const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <NoSSR fallback={<div className="flex h-screen items-center justify-center bg-slate-50"><div className="text-slate-400">Carregando...</div></div>}>
      <CRMProvider>
        <InnerApp />
      </CRMProvider>
    </NoSSR>
  </QueryClientProvider>
);

export default function Home() {
  return <App />;
}
