import { LayoutDashboard, PieChart, Package, Users, Briefcase, ShieldCheck, Settings } from 'lucide-react';
import type React from 'react';

export type View = 'kanban' | 'dashboard' | 'customers' | 'team' | 'products' | 'sales_validation' | 'settings';

export const NAV_ITEMS: Array<{ view: View; label: string; icon: React.ElementType; href?: string }> = [
  { view: 'kanban', label: 'Kanban', icon: LayoutDashboard },
  { view: 'dashboard', label: 'Dashboard', icon: PieChart },
  { view: 'customers', label: 'Consorciados', icon: Briefcase },
  { view: 'team', label: 'Equipe & PDVs', icon: Users },
  { view: 'products', label: 'Planos', icon: Package },
  { view: 'sales_validation', label: 'Validação', icon: ShieldCheck },
  { view: 'settings', label: 'Configurações', icon: Settings, href: '/settings' },
];

export const VIEW_TITLES: Record<View, string> = {
  kanban: 'Kanban',
  dashboard: 'Dashboard',
  customers: 'Consorciados',
  team: 'Equipe & PDVs',
  products: 'Planos',
  sales_validation: 'Validação de Vendas',
  settings: 'Configurações',
};
