'use client';

import React, { createContext, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  PDV, Employee, Product, Customer, Deal, PipelineStage,
  Sale, SaleConsistencyStatus
} from '@/types';
import {
  dealsApi,
  customersApi,
  productsApi,
  employeesApi,
  pdvsApi,
  stagesApi,
  salesApi
} from '@/services/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface CRMContextData {
  currentUser: Employee | null;
  setCurrentUser: (employee: Employee | null) => void;
  pdvs: PDV[] | undefined;
  employees: Employee[] | undefined;
  products: Product[] | undefined;
  customers: Customer[] | undefined;
  deals: Deal[] | undefined;
  stages: PipelineStage[] | undefined;
  sales: Sale[] | undefined;
  salesLoading: boolean;
  salesCounts: Record<SaleConsistencyStatus, number> | undefined;
  isAuthLoading: boolean;
  isAuthResolved: boolean;
  isLoading: boolean;
  
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

  // Sales Validation
  addSale: (sale: Partial<Sale> & { customerName: string; totalValue: number }) => void;
  updateSale: (sale: Partial<Sale> & { id: string }) => void;
  removeSale: (id: string) => void;
  validateSale: (saleId: string, status: 'CONSISTENT' | 'INCONSISTENT', notes?: string) => void;
  updateInstallment: (
    saleId: string,
    installmentNumber: 1 | 2 | 3 | 4,
    status: 'PENDING' | 'RECEIVED' | 'OVERDUE',
    receivedDate?: string
  ) => void;
  refreshSales: () => void;
  
  // Stage operations
  addStage: (stage: Omit<PipelineStage, 'id'>) => void;
  updateStage: (stage: PipelineStage) => void;
  removeStage: (id: string) => void;
  reorderStages: (newOrder: PipelineStage[]) => void;
  
  // Helper functions
  getPDVName: (id: string | null) => string;
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

  const stagesQuery = useQuery({
    queryKey: ['stages'],
    queryFn: () => stagesApi.getAll(),
    staleTime: 1000 * 60 * 5,
  });

  const salesQuery = useQuery({
    queryKey: ['sales'],
    queryFn: () => salesApi.getAll(),
    enabled: !!currentUserState?.id,
    staleTime: 1000 * 30,
  });

  const salesCountsQuery = useQuery({
    queryKey: ['sales-counts'],
    queryFn: () => salesApi.getCounts(),
    enabled: !!currentUserState?.id,
    refetchInterval: 30000,
  });

  const pdvsData = Array.isArray(pdvsQuery.data) ? pdvsQuery.data : [];
  const employeesData = Array.isArray(employeesQuery.data) ? employeesQuery.data : [];
  const productsData = Array.isArray(productsQuery.data) ? productsQuery.data : [];
  const customersData = Array.isArray(customersQuery.data) ? customersQuery.data : [];
  const dealsData = Array.isArray(dealsQuery.data) ? dealsQuery.data : [];
  const stagesData = Array.isArray(stagesQuery.data) ? stagesQuery.data : [];
  const salesData = Array.isArray(salesQuery.data) ? salesQuery.data : [];
  const salesCounts = (salesCountsQuery.data && typeof salesCountsQuery.data === 'object')
    ? (salesCountsQuery.data as Record<SaleConsistencyStatus, number>)
    : undefined;
 
  const isLoading =
    pdvsQuery.isLoading ||
    employeesQuery.isLoading ||
    productsQuery.isLoading ||
    customersQuery.isLoading ||
    dealsQuery.isLoading ||
    stagesQuery.isLoading;

  const salesLoading = salesQuery.isLoading;
 
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
      return Promise.all(stages.map((stage, index) => 
        stagesApi.update(stage.id, stage)
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
    },
  });

  const getPDVName = React.useCallback((id: string | null) => {
    if (!id) return 'Sem vínculo';
    return pdvsData.find(p => p.id === id)?.name || 'PDV removido';
  }, [pdvsData]);

  const getEmployeeName = React.useCallback((id: string) => {
    if (!id) return 'Desconhecido';
    return employeesData.find(e => e.id === id)?.name || 'Desconhecido';
  }, [employeesData]);

  const getProductName = React.useCallback((id: string) => {
    if (!id) return 'Item Removido';
    return productsData.find(p => p.id === id)?.name || 'Item Removido';
  }, [productsData]);

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

  const addSaleMutation = useMutation({
    mutationFn: (sale: Partial<Sale> & { customerName: string; totalValue: number }) => salesApi.create(sale),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales-counts'] });
    },
  });

  const updateSaleMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<Sale> & { id: string }) => salesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales-counts'] });
    },
  });

  const removeSaleMutation = useMutation({
    mutationFn: (id: string) => salesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales-counts'] });
    },
  });

  const validateSaleMutation = useMutation({
    mutationFn: ({ saleId, status, notes }: { saleId: string; status: 'CONSISTENT' | 'INCONSISTENT'; notes?: string }) =>
      salesApi.validate(saleId, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales-counts'] });
    },
  });

  const updateInstallmentMutation = useMutation({
    mutationFn: ({ saleId, installmentNumber, status, receivedDate }: {
      saleId: string;
      installmentNumber: 1 | 2 | 3 | 4;
      status: 'PENDING' | 'RECEIVED' | 'OVERDUE';
      receivedDate?: string;
    }) => salesApi.updateInstallment(saleId, installmentNumber, status, receivedDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });

  const refreshSales = () => {
    queryClient.invalidateQueries({ queryKey: ['sales'] });
    queryClient.invalidateQueries({ queryKey: ['sales-counts'] });
  };

  return (
    <CRMContext.Provider value={{
      currentUser: currentUserState, setCurrentUser,
      pdvs: pdvsData,
      employees: employeesData,
      products: productsData,
      customers: filteredCustomers,
      deals: filteredDeals,
      stages: stagesData,
      sales: salesData,
      salesLoading,
      salesCounts,
      isAuthLoading,
      isAuthResolved,
      isLoading,
      addPDV, updatePDV, removePDV,
      addEmployee, updateEmployee, removeEmployee,
      addCustomer, updateCustomer,
      addProduct, updateProduct, removeProduct,
      addDeal, updateDeal, removeDeal,
      addStage, updateStage, removeStage, reorderStages,
      addSale: (sale) => addSaleMutation.mutate(sale),
      updateSale: (sale) => updateSaleMutation.mutate(sale),
      removeSale: (id) => removeSaleMutation.mutate(id),
      validateSale: (saleId, status, notes) => validateSaleMutation.mutate({ saleId, status, notes }),
      updateInstallment: (saleId, installmentNumber, status, receivedDate) =>
        updateInstallmentMutation.mutate({ saleId, installmentNumber, status, receivedDate }),
      refreshSales,
      getPDVName, getEmployeeName, getProductName
    }}>
      {children}
    </CRMContext.Provider>
  );
};

export const useCRM = () => useContext(CRMContext);
