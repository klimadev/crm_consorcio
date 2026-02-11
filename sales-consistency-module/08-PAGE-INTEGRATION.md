# Step 08 — Main Page Navigation Integration

## Overview

Add the "Validação de Vendas" view to the main application's sidebar navigation, following the exact pattern of existing nav items in `src/app/page.tsx`.

---

## Changes to `src/app/page.tsx`

### 1. Import the New Component

```diff
 import { DashboardBI, KanbanBoard, CustomersView, ProductsView, TeamPlacesView, NoSSR } from '@/components';
+import { ValidatorDashboard } from '@/components';
-import { LayoutDashboard, PieChart, Package, Users, Briefcase, ChevronDown } from 'lucide-react';
+import { LayoutDashboard, PieChart, Package, Users, Briefcase, ChevronDown, ShieldCheck } from 'lucide-react';
```

### 2. Extend the `View` Union Type

```diff
-type View = 'kanban' | 'dashboard' | 'customers' | 'team' | 'products';
+type View = 'kanban' | 'dashboard' | 'customers' | 'team' | 'products' | 'sales_validation';
```

### 3. Add to `NAV_ITEMS`

```diff
 const NAV_ITEMS: Array<{ view: View; label: string; icon: React.ElementType }> = [
   { view: 'kanban', label: 'Kanban', icon: LayoutDashboard },
   { view: 'dashboard', label: 'Dashboard', icon: PieChart },
   { view: 'customers', label: 'Consorciados', icon: Briefcase },
   { view: 'team', label: 'Equipe & PDVs', icon: Users },
   { view: 'products', label: 'Planos', icon: Package },
+  { view: 'sales_validation', label: 'Validação', icon: ShieldCheck },
 ];
```

### 4. Add to `VIEW_TITLES`

```diff
 const VIEW_TITLES: Record<View, string> = {
   kanban: 'Kanban',
   dashboard: 'Dashboard',
   customers: 'Consorciados',
   team: 'Equipe & PDVs',
   products: 'Planos',
+  sales_validation: 'Validação de Vendas',
 };
```

### 5. Add View Rendering

In the main content area, add the new view:

```diff
 <div className="flex-1 overflow-y-auto relative bg-slate-50">
   {currentView === 'kanban' && <KanbanBoard />}
   {currentView === 'dashboard' && <DashboardBI />}
   {currentView === 'customers' && <CustomersView />}
   {currentView === 'team' && <TeamPlacesView />}
   {currentView === 'products' && <ProductsView />}
+  {currentView === 'sales_validation' && <ValidatorDashboard />}
 </div>
```

### 6. Optional: Badge Count in Sidebar

To show the pending validation count as a badge in the sidebar, update the `NavItem` component to accept an optional `badge` prop:

```typescript
// In InnerApp, compute the pending count
const pendingSalesCount = useMemo(() => {
  // Access from CRM context salesCounts
  return salesCounts?.AWAITING_CONSISTENCY || 0;
}, [salesCounts]);
```

And modify `NAV_ITEMS` rendering to pass the badge:

```typescript
{NAV_ITEMS.map((item) => (
  <NavItem
    key={item.view}
    {...item}
    currentView={currentView}
    setCurrentView={setCurrentView}
    badge={item.view === 'sales_validation' ? pendingSalesCount : undefined}
  />
))}
```

Update `NavItem` to render the badge:

```typescript
const NavItem = ({ view, icon: Icon, label, currentView, setCurrentView, badge }) => (
  <button ...>
    <Icon size={20} ... />
    {label}
    {badge !== undefined && badge > 0 && (
      <span className="ml-auto bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
        {badge}
      </span>
    )}
  </button>
);
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/app/page.tsx` | Add import, extend `View` type, add nav item, add view title, render component, optional badge |
| `src/components/index.ts` | Export `ValidatorDashboard` (done in Step 06) |
