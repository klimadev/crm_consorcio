'use client';

import React, { createContext, useContext } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customersApi, dealsApi, employeesApi, pdvsApi, stagesApi } from '@/services/api';
import type { Customer, Deal, Employee, PDV, PipelineStage } from '@/types';
import type { SessionUser } from '@/types/auth';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface CRMContextData {
  currentUser: SessionUser | null;
  pdvs: PDV[] | undefined;
  employees: Employee[] | undefined;
  customers: Customer[] | undefined;
  deals: Deal[] | undefined;
  stages: PipelineStage[] | undefined;
  isAuthLoading: boolean;
  isAuthResolved: boolean;
  isLoading: boolean;
  addPDV: (pdv: Omit<PDV, 'id'>) => Promise<void>;
  updatePDV: (pdv: PDV) => Promise<void>;
  removePDV: (id: string) => Promise<void>;
  addEmployee: (employee: Omit<Employee, 'id'>) => Promise<void>;
  updateEmployee: (employee: Employee) => Promise<void>;
  removeEmployee: (id: string) => Promise<void>;
  addCustomer: (customer: Omit<Customer, 'id'>) => Promise<void>;
  updateCustomer: (customer: Customer) => Promise<void>;
  addDeal: (deal: Omit<Deal, 'id'>) => Promise<void>;
  updateDeal: (deal: Deal) => Promise<void>;
  removeDeal: (id: string) => Promise<void>;
  addStage: (stage: Omit<PipelineStage, 'id'>) => Promise<void>;
  updateStage: (stage: PipelineStage) => Promise<void>;
  removeStage: (id: string) => Promise<void>;
  reorderStages: (newOrder: PipelineStage[]) => Promise<void>;
  getPDVName: (id: string | null) => string;
  getEmployeeName: (id: string) => string;
}

const CRMContext = createContext<CRMContextData>({} as CRMContextData);

export const CRMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const currentUserQuery = useCurrentUser();
  const isAuthLoading = currentUserQuery.isLoading;
  const [isAuthResolved, setIsAuthResolved] = React.useState(false);
  const [currentUserState, setCurrentUser] = React.useState<SessionUser | null>(null);

  // Log do estado da query
  React.useEffect(() => {
    console.log('[CRMContext] Query state changed:', {
      status: currentUserQuery.status,
      isLoading: currentUserQuery.isLoading,
      isFetching: currentUserQuery.isFetching,
      data: currentUserQuery.data,
      error: currentUserQuery.error,
    });
  }, [currentUserQuery.status, currentUserQuery.isLoading, currentUserQuery.isFetching, currentUserQuery.data, currentUserQuery.error]);

  // Efeito para resolver autenticação
  React.useEffect(() => {
    console.log('[CRMContext] Auth effect triggered');
    console.log('[CRMContext] - status:', currentUserQuery.status);
    console.log('[CRMContext] - data:', currentUserQuery.data);
    
    // Se ainda está carregando, não resolver ainda
    if (currentUserQuery.status === 'pending') {
      console.log('[CRMContext] - Still pending, waiting...');
      setIsAuthResolved(false);
      return;
    }

    // Se houve erro, considerar não autenticado
    if (currentUserQuery.status === 'error') {
      console.log('[CRMContext] - Query error:', currentUserQuery.error);
      setCurrentUser(null);
      setIsAuthResolved(true);
      return;
    }

    // Verificar se temos um usuário válido
    const userData = currentUserQuery.data;
    
    if (userData && typeof userData === 'object' && 'userId' in userData) {
      console.log('[CRMContext] - Valid user found:', userData);
      setCurrentUser(userData as SessionUser);
      setIsAuthResolved(true);
    } else {
      console.log('[CRMContext] - No valid user, data was:', userData);
      setCurrentUser(null);
      setIsAuthResolved(true);
    }
  }, [currentUserQuery.status, currentUserQuery.data, currentUserQuery.error]);

  const pdvsQuery = useQuery({
    queryKey: ['pdvs'],
    queryFn: () => pdvsApi.getAll(),
    staleTime: 1000 * 60 * 5,
    enabled: !!currentUserState, // Só buscar dados quando tiver usuário
  });

  const employeesQuery = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesApi.getAll(),
    staleTime: 1000 * 60 * 5,
    enabled: !!currentUserState,
  });

  const customersQuery = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.getAll(),
    staleTime: 1000 * 60 * 5,
    enabled: !!currentUserState,
  });

  const dealsQuery = useQuery({
    queryKey: ['deals'],
    queryFn: () => dealsApi.getAll(),
    staleTime: 1000 * 60 * 2,
    enabled: !!currentUserState,
  });

  const stagesQuery = useQuery({
    queryKey: ['stages'],
    queryFn: () => stagesApi.getAll(),
    staleTime: 1000 * 60 * 5,
    enabled: !!currentUserState,
  });

  const pdvsData = React.useMemo(
    () => (Array.isArray(pdvsQuery.data) ? pdvsQuery.data : []),
    [pdvsQuery.data]
  );
  const employeesData = React.useMemo(
    () => (Array.isArray(employeesQuery.data) ? employeesQuery.data : []),
    [employeesQuery.data]
  );
  const customersData = React.useMemo(
    () => (Array.isArray(customersQuery.data) ? customersQuery.data : []),
    [customersQuery.data]
  );
  const dealsData = React.useMemo(
    () => (Array.isArray(dealsQuery.data) ? dealsQuery.data : []),
    [dealsQuery.data]
  );
  const stagesData = React.useMemo(
    () => (Array.isArray(stagesQuery.data) ? stagesQuery.data : []),
    [stagesQuery.data]
  );

  const isLoading =
    pdvsQuery.isLoading ||
    employeesQuery.isLoading ||
    customersQuery.isLoading ||
    dealsQuery.isLoading ||
    stagesQuery.isLoading;

  const filteredDeals = React.useMemo(() => {
    if (!currentUserState) return dealsData;
    return dealsData.filter((deal) => {
      if (currentUserState.role === 'OWNER') return true;
      return true;
    });
  }, [dealsData, currentUserState]);

  const filteredCustomers = React.useMemo(() => {
    if (!currentUserState) return customersData;
    if (currentUserState.role === 'OWNER') return customersData;
    return customersData;
  }, [customersData, currentUserState]);

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
    mutationFn: (stages: PipelineStage[]) => Promise.all(stages.map((stage) => stagesApi.update(stage.id, stage))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
    },
  });

  const getPDVName = React.useCallback(
    (id: string | null) => {
      if (!id) return 'Sem vínculo';
      return pdvsData.find((pdv) => pdv.id === id)?.name || 'PDV removido';
    },
    [pdvsData]
  );

  const getEmployeeName = React.useCallback(
    (id: string) => {
      if (!id) return 'Desconhecido';
      return employeesData.find((employee) => employee.id === id)?.name || 'Desconhecido';
    },
    [employeesData]
  );

  console.log('[CRMContext] Rendering with:', {
    isAuthResolved,
    currentUserState: currentUserState ? 'present' : 'null',
    isAuthLoading,
  });

  return (
    <CRMContext.Provider
      value={{
        currentUser: currentUserState,
        pdvs: pdvsData,
        employees: employeesData,
        customers: filteredCustomers,
        deals: filteredDeals,
        stages: stagesData,
        isAuthLoading,
        isAuthResolved,
        isLoading,
        addPDV: async (pdv) => { await addPDVMutation.mutateAsync(pdv); },
        updatePDV: async (pdv) => { await updatePDVMutation.mutateAsync(pdv); },
        removePDV: async (id) => { await removePDVMutation.mutateAsync(id); },
        addEmployee: async (employee) => { await addEmployeeMutation.mutateAsync(employee); },
        updateEmployee: async (employee) => { await updateEmployeeMutation.mutateAsync(employee); },
        removeEmployee: async (id) => { await removeEmployeeMutation.mutateAsync(id); },
        addCustomer: async (customer) => { await addCustomerMutation.mutateAsync(customer); },
        updateCustomer: async (customer) => { await updateCustomerMutation.mutateAsync(customer); },
        addDeal: async (deal) => { await addDealMutation.mutateAsync(deal); },
        updateDeal: async (deal) => { await updateDealMutation.mutateAsync(deal); },
        removeDeal: async (id) => { await removeDealMutation.mutateAsync(id); },
        addStage: async (stage) => { await addStageMutation.mutateAsync(stage); },
        updateStage: async (stage) => { await updateStageMutation.mutateAsync(stage); },
        removeStage: async (id) => { await removeStageMutation.mutateAsync(id); },
        reorderStages: async (newOrder) => { await reorderStagesMutation.mutateAsync(newOrder); },
        getPDVName,
        getEmployeeName,
      }}
    >
      {children}
    </CRMContext.Provider>
  );
};

export const useCRM = () => useContext(CRMContext);
