'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  Region, PDV, Employee, Product, Customer, Deal, Tag, PipelineStage, DashboardWidget, Integration, IntegrationStatus, CustomFieldDefinition 
} from '@/types';
import { 
  INITIAL_REGIONS, INITIAL_PDVS, INITIAL_EMPLOYEES, 
  INITIAL_PRODUCTS, INITIAL_CUSTOMERS, INITIAL_DEALS, 
  AVAILABLE_TAGS, INITIAL_STAGES, DEFAULT_DASHBOARD_WIDGETS, INITIAL_CUSTOM_FIELDS 
} from '@/constants';

interface CRMContextData {
  currentUser: Employee;
  setCurrentUser: (employee: Employee) => void;
  regions: Region[];
  pdvs: PDV[];
  employees: Employee[];
  products: Product[];
  customers: Customer[];
  deals: Deal[];
  tags: Tag[];
  stages: PipelineStage[];
  integrations: Integration[];
  customFieldDefs: CustomFieldDefinition[];
  dashboardWidgets: DashboardWidget[];
  addWidget: (widget: DashboardWidget) => void;
  updateWidget: (widget: DashboardWidget) => void;
  removeWidget: (id: string) => void;
  reorderWidgets: (newOrder: DashboardWidget[]) => void;
  resetDashboard: () => void;
  addRegion: (region: Region) => void;
  removeRegion: (id: string) => void;
  addPDV: (pdv: PDV) => void;
  updatePDV: (pdv: PDV) => void; 
  removePDV: (id: string) => void;
  addEmployee: (employee: Employee) => void;
  updateEmployee: (employee: Employee) => void; 
  removeEmployee: (id: string) => void;
  addCustomer: (customer: Customer) => void;
  updateCustomer: (customer: Customer) => void;
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  removeProduct: (id: string) => void;
  addDeal: (deal: Deal) => void;
  updateDeal: (deal: Deal) => void;
  removeDeal: (id: string) => void;
  addStage: (stage: PipelineStage) => void;
  updateStage: (stage: PipelineStage) => void;
  removeStage: (id: string) => void;
  reorderStages: (newOrder: PipelineStage[]) => void;
  addTag: (tag: Tag) => void; 
  addCustomFieldDef: (field: CustomFieldDefinition) => void;
  updateCustomFieldDef: (field: CustomFieldDefinition) => void;
  removeCustomFieldDef: (id: string) => void;
  updateIntegrationStatus: (id: string, status: IntegrationStatus) => void;
  getPDVName: (id: string | null) => string;
  getRegionName: (id: string) => string;
  getEmployeeName: (id: string) => string;
  getProductName: (id: string) => string;
}

const CRMContext = createContext<CRMContextData>({} as CRMContextData);

export const CRMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
const usePersistedState = <T,>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
    const [state, setState] = useState<T>(initial);
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
      if (typeof window !== 'undefined') {
        try {
          const saved = localStorage.getItem(key);
          if (saved) {
            setState(JSON.parse(saved));
          }
        } catch (error) {
          console.warn(`Error reading localStorage key "${key}":`, error);
        }
        setIsHydrated(true);
      }
    }, [key]);

    useEffect(() => {
      if (isHydrated && typeof window !== 'undefined') {
        try {
          localStorage.setItem(key, JSON.stringify(state));
        } catch (error) {
          console.warn(`Error writing localStorage key "${key}":`, error);
        }
      }
    }, [key, state, isHydrated]);

    return [state, setState];
  };

  const [regions, setRegions] = usePersistedState('mc_regions', INITIAL_REGIONS);
  const [pdvs, setPdvs] = usePersistedState('mc_pdvs', INITIAL_PDVS);
  const [employees, setEmployees] = usePersistedState('mc_employees', INITIAL_EMPLOYEES);
  const [products, setProducts] = usePersistedState('mc_products', INITIAL_PRODUCTS);
  const [allCustomers, setAllCustomers] = usePersistedState('mc_customers', INITIAL_CUSTOMERS);
  const [allDeals, setAllDeals] = usePersistedState('mc_deals', INITIAL_DEALS);
  const [stages, setStages] = usePersistedState('mc_stages', INITIAL_STAGES);
  const [tags, setTags] = usePersistedState('mc_tags', AVAILABLE_TAGS); 
  const [dashboardWidgets, setDashboardWidgets] = usePersistedState('mc_dashboard', DEFAULT_DASHBOARD_WIDGETS);
  const [customFieldDefs, setCustomFieldDefs] = usePersistedState('mc_custom_fields', INITIAL_CUSTOM_FIELDS);
  
  const [integrations, setIntegrations] = usePersistedState<Integration[]>('mc_integrations', [
    { id: 'whatsapp-1', type: 'WHATSAPP', name: 'WhatsApp Business', status: 'DISCONNECTED', config: {} }
  ]);

  const [currentUser, setCurrentUser] = useState<Employee>(INITIAL_EMPLOYEES[0]);

  const filteredDeals = useMemo(() => {
    return allDeals.filter(deal => {
       if (currentUser.role === 'ADMIN') return true;
       if (currentUser.role === 'MANAGER' && deal.pdvId === currentUser.pdvId) return true;
       const isSameScope = deal.pdvId === currentUser.pdvId;
       if (isSameScope && deal.visibility === 'PUBLIC') return true;
       return deal.assignedEmployeeIds.includes(currentUser.id);
    });
  }, [allDeals, currentUser]);

  const filteredCustomers = useMemo(() => {
    if (currentUser.role === 'ADMIN') return allCustomers;
    if (currentUser.pdvId) {
      return allCustomers.filter(c => c.pdvIds.includes(currentUser.pdvId!));
    }
    return allCustomers;
  }, [allCustomers, currentUser]);

  const addWidget = (widget: DashboardWidget) => setDashboardWidgets([...dashboardWidgets, widget]);
  const updateWidget = (updated: DashboardWidget) => setDashboardWidgets(dashboardWidgets.map(w => w.id === updated.id ? updated : w));
  const removeWidget = (id: string) => setDashboardWidgets(dashboardWidgets.filter(w => w.id !== id));
  const reorderWidgets = (newOrder: DashboardWidget[]) => setDashboardWidgets(newOrder);
  const resetDashboard = () => setDashboardWidgets(DEFAULT_DASHBOARD_WIDGETS);

  const addRegion = (item: Region) => setRegions([...regions, item]);
  const removeRegion = (id: string) => setRegions(regions.filter(r => r.id !== id));
  
  const addPDV = (item: PDV) => setPdvs([...pdvs, item]);
  const updatePDV = (updated: PDV) => setPdvs(pdvs.map(p => p.id === updated.id ? updated : p));
  const removePDV = (id: string) => setPdvs(pdvs.filter(p => p.id !== id));

  const addEmployee = (item: Employee) => setEmployees([...employees, item]);
  const updateEmployee = (updated: Employee) => setEmployees(employees.map(e => e.id === updated.id ? updated : e));
  const removeEmployee = (id: string) => setEmployees(employees.filter(e => e.id !== id));
  
  const addCustomer = (item: Customer) => {
    const secureItem = { ...item };
    if (currentUser.role !== 'ADMIN' && currentUser.pdvId) {
       if (!secureItem.pdvIds.includes(currentUser.pdvId)) {
          secureItem.pdvIds = [...secureItem.pdvIds, currentUser.pdvId];
       }
    }
    setAllCustomers([...allCustomers, secureItem]);
  };
  const updateCustomer = (updated: Customer) => setAllCustomers(allCustomers.map(c => c.id === updated.id ? updated : c));

  const addProduct = (item: Product) => setProducts([...products, item]);
  const updateProduct = (updated: Product) => setProducts(products.map(p => p.id === updated.id ? updated : p));
  const removeProduct = (id: string) => setProducts(products.filter(p => p.id !== id));

  const addDeal = (item: Deal) => {
     let finalPdvId = item.pdvId;
     if (finalPdvId === undefined) {
        if (currentUser.pdvId) {
           finalPdvId = currentUser.pdvId;
        } else {
           finalPdvId = null;
        }
     }
     setAllDeals([...allDeals, { ...item, pdvId: finalPdvId }]);
  };
  const updateDeal = (updated: Deal) => setAllDeals(allDeals.map(d => d.id === updated.id ? updated : d));
  const removeDeal = (id: string) => setAllDeals(allDeals.filter(d => d.id !== id));

  const addStage = (stage: PipelineStage) => setStages([...stages, stage]);
  const updateStage = (updated: PipelineStage) => setStages(stages.map(s => s.id === updated.id ? updated : s));
  const removeStage = (id: string) => {
    const fallbackStage = stages.find(s => s.id !== id);
    if (fallbackStage) {
      const dealsToMove = allDeals.filter(d => d.stageId === id);
      if (dealsToMove.length > 0) setAllDeals(allDeals.map(d => d.stageId === id ? { ...d, stageId: fallbackStage.id } : d));
    }
    setStages(stages.filter(s => s.id !== id));
  };
  const reorderStages = (newOrder: PipelineStage[]) => setStages(newOrder);

  const addTag = (tag: Tag) => setTags([...tags, tag]);

  const addCustomFieldDef = (field: CustomFieldDefinition) => setCustomFieldDefs([...customFieldDefs, field]);
  const updateCustomFieldDef = (updated: CustomFieldDefinition) => setCustomFieldDefs(customFieldDefs.map(f => f.id === updated.id ? updated : f));
  const removeCustomFieldDef = (id: string) => setCustomFieldDefs(customFieldDefs.filter(f => f.id !== id));

  const updateIntegrationStatus = (id: string, status: IntegrationStatus) => {
    setIntegrations(integrations.map(i => i.id === id ? { ...i, status } : i));
  };

  const getPDVName = (id: string | null) => pdvs.find(p => p.id === id)?.name || 'Matriz / Corporativo';
  const getRegionName = (id: string) => regions.find(r => r.id === id)?.name || 'Região Indefinida';
  const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || 'Desconhecido';
  const getProductName = (id: string) => products.find(p => p.id === id)?.name || 'Item Removido';

  return (
    <CRMContext.Provider value={{
      currentUser, setCurrentUser,
      regions, pdvs, employees, products, customers: filteredCustomers, deals: filteredDeals, tags, stages, integrations, customFieldDefs,
      dashboardWidgets, addWidget, updateWidget, removeWidget, reorderWidgets, resetDashboard,
      addRegion, removeRegion, addPDV, updatePDV, removePDV,
      addEmployee, updateEmployee, removeEmployee, addCustomer, updateCustomer,
      addProduct, updateProduct, removeProduct,
      addDeal, updateDeal, removeDeal,
      addStage, updateStage, removeStage, reorderStages,
      addTag,
      addCustomFieldDef, updateCustomFieldDef, removeCustomFieldDef,
      updateIntegrationStatus,
      getPDVName, getRegionName, getEmployeeName, getProductName
    }}>
      {children}
    </CRMContext.Provider>
  );
};

export const useCRM = () => useContext(CRMContext);
