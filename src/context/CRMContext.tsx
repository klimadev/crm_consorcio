'use client';

import React, { createContext, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Region, PDV, Employee, Product, Customer, Deal, Tag, PipelineStage, DashboardWidget, Integration, IntegrationStatus, CustomFieldDefinition 
} from '@/types';
import {
  dealsApi,
  customersApi,
  productsApi,
  employeesApi,
  regionsApi,
  pdvsApi,
  stagesApi,
  tagsApi,
  dashboardApi,
  customFieldsApi,
  integrationsApi
} from '@/services/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface CRMContextData {
  currentUser: Employee | null;
  setCurrentUser: (employee: Employee | null) => void;
  regions: Region[] | undefined;
  pdvs: PDV[] | undefined;
  employees: Employee[] | undefined;
  products: Product[] | undefined;
  customers: Customer[] | undefined;
  deals: Deal[] | undefined;
  tags: Tag[] | undefined;
  stages: PipelineStage[] | undefined;
  integrations: Integration[] | undefined;
  customFieldDefs: CustomFieldDefinition[] | undefined;
  dashboardWidgets: DashboardWidget[] | undefined;
  isAuthLoading: boolean;
  isAuthResolved: boolean;
  isLoading: boolean;
  
  // Dashboard operations
  addWidget: (widget: DashboardWidget) => void;
  updateWidget: (widget: DashboardWidget) => void;
  removeWidget: (id: string) => void;
  reorderWidgets: (newOrder: DashboardWidget[]) => void;
  resetDashboard: () => void;
  
  // Region operations
  addRegion: (region: Omit<Region, 'id'>) => void;
  removeRegion: (id: string) => void;
  
  // PDV operations
  addPDV: (pdv: Omit<PDV, 'id'>) => void;
  updatePDV: (pdv: PDV) => void;
  removePDV: (id: string) => void;
  
  // Employee operations
  addEmployee: (employee: Omit<Employee, 'id'>) => void;
  updateEmployee: (employee: Employee) => void;
  removeEmployee: (id: string) => void;
  
  // Customer operations
  addCustomer: (customer: Omit<Customer, 'id'>) => void;
  updateCustomer: (customer: Customer) => void;
  
  // Product operations
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (product: Product) => void;
  removeProduct: (id: string) => void;
  
  // Deal operations
  addDeal: (deal: Omit<Deal, 'id'>) => void;
  updateDeal: (deal: Deal) => void;
  removeDeal: (id: string) => void;
  
  // Stage operations
  addStage: (stage: Omit<PipelineStage, 'id'>) => void;
  updateStage: (stage: PipelineStage) => void;
  removeStage: (id: string) => void;
  reorderStages: (newOrder: PipelineStage[]) => void;
  
  // Tag operations
  addTag: (tag: Omit<Tag, 'id'>) => void;
  
  // Custom field operations
  addCustomFieldDef: (field: Omit<CustomFieldDefinition, 'id'>) => void;
  updateCustomFieldDef: (field: CustomFieldDefinition) => void;
  removeCustomFieldDef: (id: string) => void;
  
  // Integration operations
  updateIntegrationStatus: (id: string, status: IntegrationStatus) => void;
  
  // Helper functions
  getPDVName: (id: string | null) => string;
  getRegionName: (id: string) => string;
  getEmployeeName: (id: string) => string;
  getProductName: (id: string) => string;
}

const CRMContext = createContext<CRMContextData>({} as CRMContextData);

export const CRMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const currentUserQuery = useCurrentUser();
  const { data: currentUser } = currentUserQuery;
  const isAuthLoading = currentUserQuery.isLoading;
  const [isAuthResolved, setIsAuthResolved] = React.useState(false);
  const [currentUserState, setCurrentUser] = React.useState<Employee | null>(null);

  // Update local state when API data changes
  React.useEffect(() => {
    if (currentUserQuery.status === 'pending') {
      setIsAuthResolved(false);
      return;
    }

    const isValidUser = (value: unknown): value is Employee => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
      const candidate = value as Employee;
      return typeof candidate.name === 'string' && candidate.name.trim().length > 0;
    };

    if (isValidUser(currentUser)) {
      setCurrentUser(currentUser);
      setIsAuthResolved(true);
      return;
    }

    setCurrentUser(null);
    setIsAuthResolved(true);
  }, [currentUser, currentUserQuery.status]);

  // Base queries
  const regionsQuery = useQuery({
    queryKey: ['regions'],
    queryFn: () => regionsApi.getAll(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const pdvsQuery = useQuery({
    queryKey: ['pdvs'],
    queryFn: () => pdvsApi.getAll(),
    staleTime: 1000 * 60 * 5,
  });

  const employeesQuery = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesApi.getAll(),
    staleTime: 1000 * 60 * 5,
  });

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.getAll(),
    staleTime: 1000 * 60 * 5,
  });

  const customersQuery = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.getAll(),
    staleTime: 1000 * 60 * 5,
  });

  const dealsQuery = useQuery({
    queryKey: ['deals'],
    queryFn: () => dealsApi.getAll(),
    staleTime: 1000 * 60 * 2,
  });

  const tagsQuery = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagsApi.getAll(),
    staleTime: 1000 * 60 * 5,
  });

  const stagesQuery = useQuery({
    queryKey: ['stages'],
    queryFn: () => stagesApi.getAll(),
    staleTime: 1000 * 60 * 5,
  });

  const integrationsQuery = useQuery({
    queryKey: ['integrations'],
    queryFn: () => integrationsApi.getAll(),
    staleTime: 1000 * 60 * 5,
  });

  const customFieldsQuery = useQuery({
    queryKey: ['customFields'],
    queryFn: () => customFieldsApi.getAll(),
    staleTime: 1000 * 60 * 5,
  });

  const dashboardWidgetsQuery = useQuery({
    queryKey: ['dashboardWidgets'],
    queryFn: () => dashboardApi.getAll(),
    staleTime: 1000 * 60 * 5,
  });

  const regionsData = Array.isArray(regionsQuery.data) ? regionsQuery.data : [];
  const pdvsData = Array.isArray(pdvsQuery.data) ? pdvsQuery.data : [];
  const employeesData = Array.isArray(employeesQuery.data) ? employeesQuery.data : [];
  const productsData = Array.isArray(productsQuery.data) ? productsQuery.data : [];
  const customersData = Array.isArray(customersQuery.data) ? customersQuery.data : [];
  const dealsData = Array.isArray(dealsQuery.data) ? dealsQuery.data : [];
  const tagsData = Array.isArray(tagsQuery.data) ? tagsQuery.data : [];
  const stagesData = Array.isArray(stagesQuery.data) ? stagesQuery.data : [];
  const integrationsData = Array.isArray(integrationsQuery.data) ? integrationsQuery.data : [];
  const customFieldsData = Array.isArray(customFieldsQuery.data) ? customFieldsQuery.data : [];
  const dashboardWidgetsData = Array.isArray(dashboardWidgetsQuery.data) ? dashboardWidgetsQuery.data : [];

  // Calculate overall loading state
  const isLoading = regionsQuery.isLoading || pdvsQuery.isLoading || employeesQuery.isLoading || 
                   productsQuery.isLoading || customersQuery.isLoading || dealsQuery.isLoading ||
                   tagsQuery.isLoading || stagesQuery.isLoading || integrationsQuery.isLoading ||
                   customFieldsQuery.isLoading || dashboardWidgetsQuery.isLoading;

  // Filtered data based on user permissions
  const filteredDeals = React.useMemo(() => {
    if (!currentUser) return dealsData;
    return dealsData.filter(deal => {
       if (currentUser.role === 'ADMIN') return true;
       if (currentUser.role === 'MANAGER' && deal.pdvId === currentUser.pdvId) return true;
       const isSameScope = deal.pdvId === currentUser.pdvId;
       if (isSameScope && deal.visibility === 'PUBLIC') return true;
       return deal.assignedEmployeeIds?.includes(currentUser.id);
    });
  }, [dealsData, currentUser]);

  const filteredCustomers = React.useMemo(() => {
    if (!currentUser) return customersData;
    if (currentUser.role === 'ADMIN') return customersData;
    if (currentUser.pdvId) {
      return customersData.filter(c => c.pdvIds?.includes(currentUser.pdvId!));
    }
    return customersData;
  }, [customersData, currentUser]);

  // Dashboard mutations
  const addWidgetMutation = useMutation({
    mutationFn: (widget: DashboardWidget) => {
      const currentWidgets = dashboardWidgetsData;
      return dashboardApi.update([...currentWidgets, widget]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardWidgets'] });
    },
  });

  const updateWidgetMutation = useMutation({
    mutationFn: (widget: DashboardWidget) => {
      const currentWidgets = dashboardWidgetsData;
      const updated = currentWidgets.map(w => w.id === widget.id ? widget : w);
      return dashboardApi.update(updated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardWidgets'] });
    },
  });

  const removeWidgetMutation = useMutation({
    mutationFn: (id: string) => {
      const currentWidgets = dashboardWidgetsData;
      const filtered = currentWidgets.filter(w => w.id !== id);
      return dashboardApi.update(filtered);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardWidgets'] });
    },
  });

  const reorderWidgetsMutation = useMutation({
    mutationFn: (widgets: DashboardWidget[]) => dashboardApi.update(widgets),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardWidgets'] });
    },
  });

  const resetDashboardMutation = useMutation({
    mutationFn: () => {
      return dashboardApi.reset();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardWidgets'] });
    },
  });

  // Region mutations
  const addRegionMutation = useMutation({
    mutationFn: (region: Omit<Region, 'id'>) => regionsApi.create(region),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] });
    },
  });

  const removeRegionMutation = useMutation({
    mutationFn: (id: string) => regionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] });
    },
  });

  // PDV mutations
  const addPDVMutation = useMutation({
    mutationFn: (pdv: Omit<PDV, 'id'>) => pdvsApi.create(pdv),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdvs'] });
    },
  });

  const updatePDVMutation = useMutation({
    mutationFn: (pdv: PDV) => pdvsApi.update(pdv.id, pdv),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdvs'] });
    },
  });

  const removePDVMutation = useMutation({
    mutationFn: (id: string) => pdvsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdvs'] });
    },
  });

  // Employee mutations
  const addEmployeeMutation = useMutation({
    mutationFn: (employee: Omit<Employee, 'id'>) => employeesApi.create(employee),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: (employee: Employee) => employeesApi.update(employee.id, employee),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  const removeEmployeeMutation = useMutation({
    mutationFn: (id: string) => employeesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  // Customer mutations
  const addCustomerMutation = useMutation({
    mutationFn: (customer: Omit<Customer, 'id'>) => customersApi.create(customer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: (customer: Customer) => customersApi.update(customer.id, customer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  // Product mutations
  const addProductMutation = useMutation({
    mutationFn: (product: Omit<Product, 'id'>) => productsApi.create(product),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: (product: Product) => productsApi.update(product.id, product),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const removeProductMutation = useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  // Deal mutations
  const addDealMutation = useMutation({
    mutationFn: (deal: Omit<Deal, 'id'>) => dealsApi.create(deal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });

  const updateDealMutation = useMutation({
    mutationFn: (deal: Deal) => dealsApi.update(deal.id, deal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });

  const removeDealMutation = useMutation({
    mutationFn: (id: string) => dealsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });

  // Stage mutations
  const addStageMutation = useMutation({
    mutationFn: (stage: Omit<PipelineStage, 'id'>) => stagesApi.create(stage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
    },
  });

  const updateStageMutation = useMutation({
    mutationFn: (stage: PipelineStage) => stagesApi.update(stage.id, stage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
    },
  });

  const removeStageMutation = useMutation({
    mutationFn: (id: string) => stagesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
    },
  });

  const reorderStagesMutation = useMutation({
    mutationFn: (stages: PipelineStage[]) => {
      // This would need a specific API endpoint for reordering
      return Promise.all(stages.map((stage, index) => 
        stagesApi.update(stage.id, stage)
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
    },
  });

  // Tag mutations
  const addTagMutation = useMutation({
    mutationFn: (tag: Omit<Tag, 'id'>) => tagsApi.create(tag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });

  // Custom field mutations
  const addCustomFieldMutation = useMutation({
    mutationFn: (field: Omit<CustomFieldDefinition, 'id'>) => customFieldsApi.create(field),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customFields'] });
    },
  });

  const updateCustomFieldMutation = useMutation({
    mutationFn: (field: CustomFieldDefinition) => customFieldsApi.update(field.id, field),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customFields'] });
    },
  });

  const removeCustomFieldMutation = useMutation({
    mutationFn: (id: string) => customFieldsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customFields'] });
    },
  });

  // Integration mutations
  const updateIntegrationMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: IntegrationStatus }) => 
      integrationsApi.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });

  // Helper functions
  const getPDVName = React.useCallback((id: string | null) => {
    if (!id) return 'Matriz / Corporativo';
    return pdvsData.find(p => p.id === id)?.name || 'Matriz / Corporativo';
  }, [pdvsData]);

  const getRegionName = React.useCallback((id: string) => {
    if (!id) return 'Região Indefinida';
    return regionsData.find(r => r.id === id)?.name || 'Região Indefinida';
  }, [regionsData]);

  const getEmployeeName = React.useCallback((id: string) => {
    if (!id) return 'Desconhecido';
    return employeesData.find(e => e.id === id)?.name || 'Desconhecido';
  }, [employeesData]);

  const getProductName = React.useCallback((id: string) => {
    if (!id) return 'Item Removido';
    return productsData.find(p => p.id === id)?.name || 'Item Removido';
  }, [productsData]);

  // Wrapper functions for mutations
  const addWidget = (widget: DashboardWidget) => addWidgetMutation.mutate(widget);
  const updateWidget = (widget: DashboardWidget) => updateWidgetMutation.mutate(widget);
  const removeWidget = (id: string) => removeWidgetMutation.mutate(id);
  const reorderWidgets = (newOrder: DashboardWidget[]) => reorderWidgetsMutation.mutate(newOrder);
  const resetDashboard = () => resetDashboardMutation.mutate();

  const addRegion = (region: Omit<Region, 'id'>) => addRegionMutation.mutate(region);
  const removeRegion = (id: string) => removeRegionMutation.mutate(id);

  const addPDV = (pdv: Omit<PDV, 'id'>) => addPDVMutation.mutate(pdv);
  const updatePDV = (pdv: PDV) => updatePDVMutation.mutate(pdv);
  const removePDV = (id: string) => removePDVMutation.mutate(id);

  const addEmployee = (employee: Omit<Employee, 'id'>) => addEmployeeMutation.mutate(employee);
  const updateEmployee = (employee: Employee) => updateEmployeeMutation.mutate(employee);
  const removeEmployee = (id: string) => removeEmployeeMutation.mutate(id);

  const addCustomer = (customer: Omit<Customer, 'id'>) => addCustomerMutation.mutate(customer);
  const updateCustomer = (customer: Customer) => updateCustomerMutation.mutate(customer);

  const addProduct = (product: Omit<Product, 'id'>) => addProductMutation.mutate(product);
  const updateProduct = (product: Product) => updateProductMutation.mutate(product);
  const removeProduct = (id: string) => removeProductMutation.mutate(id);

  const addDeal = (deal: Omit<Deal, 'id'>) => addDealMutation.mutate(deal);
  const updateDeal = (deal: Deal) => updateDealMutation.mutate(deal);
  const removeDeal = (id: string) => removeDealMutation.mutate(id);

  const addStage = (stage: Omit<PipelineStage, 'id'>) => addStageMutation.mutate(stage);
  const updateStage = (stage: PipelineStage) => updateStageMutation.mutate(stage);
  const removeStage = (id: string) => removeStageMutation.mutate(id);
  const reorderStages = (newOrder: PipelineStage[]) => reorderStagesMutation.mutate(newOrder);

  const addTag = (tag: Omit<Tag, 'id'>) => addTagMutation.mutate(tag);

  const addCustomFieldDef = (field: Omit<CustomFieldDefinition, 'id'>) => addCustomFieldMutation.mutate(field);
  const updateCustomFieldDef = (field: CustomFieldDefinition) => updateCustomFieldMutation.mutate(field);
  const removeCustomFieldDef = (id: string) => removeCustomFieldMutation.mutate(id);

  const updateIntegrationStatus = (id: string, status: IntegrationStatus) => 
    updateIntegrationMutation.mutate({ id, status });

  return (
    <CRMContext.Provider value={{
      currentUser: currentUserState, setCurrentUser,
      regions: regionsData,
      pdvs: pdvsData,
      employees: employeesData,
      products: productsData,
      customers: filteredCustomers,
      deals: filteredDeals,
      tags: tagsData,
      stages: stagesData,
      integrations: integrationsData,
      customFieldDefs: customFieldsData,
      dashboardWidgets: dashboardWidgetsData,
      isAuthLoading,
      isAuthResolved,
      isLoading,
      
      addWidget, updateWidget, removeWidget, reorderWidgets, resetDashboard,
      addRegion, removeRegion,
      addPDV, updatePDV, removePDV,
      addEmployee, updateEmployee, removeEmployee,
      addCustomer, updateCustomer,
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
