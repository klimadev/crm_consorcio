import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Deal, Customer, Product, Employee, Region, PDV, PipelineStage, Tag, DashboardWidget, CustomFieldDefinition, Integration } from '@/types';
import { dealsApi, customersApi, productsApi, employeesApi, regionsApi, pdvsApi, stagesApi, tagsApi, dashboardApi, customFieldsApi, integrationsApi } from '@/services/api';

// Query keys for React Query
export const queryKeys = {
  deals: ['deals'] as const,
  customers: ['customers'] as const,
  products: ['products'] as const,
  employees: ['employees'] as const,
  regions: ['regions'] as const,
  pdvs: ['pdvs'] as const,
  stages: ['stages'] as const,
  tags: ['tags'] as const,
  dashboard: ['dashboard'] as const,
  customFields: ['custom-fields'] as const,
  integrations: ['integrations'] as const,
} as const;

// Deal hooks
export const useDeals = () => {
  return useQuery({
    queryKey: queryKeys.deals,
    queryFn: dealsApi.getAll,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useDeal = (id: string) => {
  return useQuery({
    queryKey: [...queryKeys.deals, id],
    queryFn: () => dealsApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateDeal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: dealsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deals });
    },
  });
};

export const useUpdateDeal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, deal }: { id: string; deal: Partial<Deal> }) => dealsApi.update(id, deal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deals });
    },
  });
};

export const useDeleteDeal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: dealsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deals });
    },
  });
};

// Customer hooks
export const useCustomers = () => {
  return useQuery({
    queryKey: queryKeys.customers,
    queryFn: customersApi.getAll,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useCustomer = (id: string) => {
  return useQuery({
    queryKey: [...queryKeys.customers, id],
    queryFn: () => customersApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: customersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers });
    },
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, customer }: { id: string; customer: Partial<Customer> }) => customersApi.update(id, customer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers });
    },
  });
};

export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: customersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers });
    },
  });
};

// Product hooks
export const useProducts = () => {
  return useQuery({
    queryKey: queryKeys.products,
    queryFn: productsApi.getAll,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useProduct = (id: string) => {
  return useQuery({
    queryKey: [...queryKeys.products, id],
    queryFn: () => productsApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products });
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, product }: { id: string; product: Partial<Product> }) => productsApi.update(id, product),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products });
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: productsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products });
    },
  });
};

// Employee hooks
export const useEmployees = () => {
  return useQuery({
    queryKey: queryKeys.employees,
    queryFn: employeesApi.getAll,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useEmployee = (id: string) => {
  return useQuery({
    queryKey: [...queryKeys.employees, id],
    queryFn: () => employeesApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: employeesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees });
    },
  });
};

export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, employee }: { id: string; employee: Partial<Employee> }) => employeesApi.update(id, employee),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees });
    },
  });
};

export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: employeesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees });
    },
  });
};

// Region hooks
export const useRegions = () => {
  return useQuery({
    queryKey: queryKeys.regions,
    queryFn: regionsApi.getAll,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useRegion = (id: string) => {
  return useQuery({
    queryKey: [...queryKeys.regions, id],
    queryFn: () => regionsApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateRegion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: regionsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.regions });
    },
  });
};

export const useUpdateRegion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, region }: { id: string; region: Partial<Region> }) => regionsApi.update(id, region),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.regions });
    },
  });
};

export const useDeleteRegion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: regionsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.regions });
    },
  });
};

// PDV hooks
export const usePDVs = () => {
  return useQuery({
    queryKey: queryKeys.pdvs,
    queryFn: pdvsApi.getAll,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const usePDV = (id: string) => {
  return useQuery({
    queryKey: [...queryKeys.pdvs, id],
    queryFn: () => pdvsApi.getById(id),
    enabled: !!id,
  });
};

export const useCreatePDV = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: pdvsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pdvs });
    },
  });
};

export const useUpdatePDV = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, pdv }: { id: string; pdv: Partial<PDV> }) => pdvsApi.update(id, pdv),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pdvs });
    },
  });
};

export const useDeletePDV = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: pdvsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pdvs });
    },
  });
};

// Stage hooks
export const useStages = () => {
  return useQuery({
    queryKey: queryKeys.stages,
    queryFn: stagesApi.getAll,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useStage = (id: string) => {
  return useQuery({
    queryKey: [...queryKeys.stages, id],
    queryFn: () => stagesApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateStage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: stagesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stages });
    },
  });
};

export const useUpdateStage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: Partial<PipelineStage> }) => stagesApi.update(id, stage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stages });
    },
  });
};

export const useDeleteStage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: stagesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stages });
    },
  });
};

// Tag hooks
export const useTags = () => {
  return useQuery({
    queryKey: queryKeys.tags,
    queryFn: tagsApi.getAll,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useTag = (id: string) => {
  return useQuery({
    queryKey: [...queryKeys.tags, id],
    queryFn: () => tagsApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateTag = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tagsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags });
    },
  });
};

export const useUpdateTag = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, tag }: { id: string; tag: Partial<Tag> }) => tagsApi.update(id, tag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags });
    },
  });
};

export const useDeleteTag = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tagsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags });
    },
  });
};

// Dashboard hooks
export const useDashboard = () => {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: dashboardApi.getAll,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useUpdateDashboard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: dashboardApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
};

// Custom Field hooks
export const useCustomFields = () => {
  return useQuery({
    queryKey: queryKeys.customFields,
    queryFn: customFieldsApi.getAll,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useCustomField = (id: string) => {
  return useQuery({
    queryKey: [...queryKeys.customFields, id],
    queryFn: () => customFieldsApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateCustomField = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: customFieldsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customFields });
    },
  });
};

export const useUpdateCustomField = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, field }: { id: string; field: Partial<CustomFieldDefinition> }) => customFieldsApi.update(id, field),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customFields });
    },
  });
};

export const useDeleteCustomField = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: customFieldsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customFields });
    },
  });
};

// Integration hooks
export const useIntegrations = () => {
  return useQuery({
    queryKey: queryKeys.integrations,
    queryFn: integrationsApi.getAll,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useIntegration = (id: string) => {
  return useQuery({
    queryKey: [...queryKeys.integrations, id],
    queryFn: () => integrationsApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateIntegration = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: integrationsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.integrations });
    },
  });
};

export const useUpdateIntegration = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, integration }: { id: string; integration: Partial<Integration> }) => integrationsApi.update(id, integration),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.integrations });
    },
  });
};

export const useDeleteIntegration = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: integrationsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.integrations });
    },
  });
};