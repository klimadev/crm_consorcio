import {
  Deal,
  Customer,
  Product,
  Employee,
  Region,
  PDV,
  PipelineStage,
  Tag,
  DashboardWidget,
  CustomFieldDefinition,
  Integration,
  CommercialDashboardFilters,
  CommercialDashboardMetrics,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// Generic API client
class ApiClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.warn(`Authentication required for ${endpoint}, returning null`);
        return null as T;
      }
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint);
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

const api = new ApiClient();

const withIdParam = (endpoint: string, id: string) => `${endpoint}?id=${encodeURIComponent(id)}`;

async function getById<T extends { id: string }>(endpoint: string, id: string): Promise<T | null> {
  const result = await api.get<T | T[]>(withIdParam(endpoint, id));
  if (Array.isArray(result)) {
    return result.find((item) => item.id === id) ?? null;
  }
  if (result && typeof result === 'object' && 'id' in result) {
    const item = result as T;
    return item.id === id ? item : null;
  }
  return null;
}

function updateById<T>(endpoint: string, id: string, data: Partial<T>): Promise<T> {
  return api.put<T>(endpoint, { ...data, id });
}

function deleteById<T>(endpoint: string, id: string): Promise<T> {
  return api.delete<T>(withIdParam(endpoint, id));
}

// Deals API
export const dealsApi = {
  getAll: () => api.get<Deal[]>('/db/deals'),
  getById: (id: string) => getById<Deal>('/db/deals', id),
  create: (deal: Omit<Deal, 'id'>) => api.post<Deal>('/db/deals', deal),
  update: (id: string, deal: Partial<Deal>) => updateById<Deal>('/db/deals', id, deal),
  delete: (id: string) => deleteById('/db/deals', id),
};

// Customers API
export const customersApi = {
  getAll: () => api.get<Customer[]>('/db/customers'),
  getById: (id: string) => getById<Customer>('/db/customers', id),
  create: (customer: Omit<Customer, 'id'>) => api.post<Customer>('/db/customers', customer),
  update: (id: string, customer: Partial<Customer>) => updateById<Customer>('/db/customers', id, customer),
  delete: (id: string) => deleteById('/db/customers', id),
};

// Products API
export const productsApi = {
  getAll: () => api.get<Product[]>('/db/products'),
  getById: (id: string) => getById<Product>('/db/products', id),
  create: (product: Omit<Product, 'id'>) => api.post<Product>('/db/products', product),
  update: (id: string, product: Partial<Product>) => updateById<Product>('/db/products', id, product),
  delete: (id: string) => deleteById('/db/products', id),
};

// Employees API
export const employeesApi = {
  getAll: () => api.get<Employee[]>('/db/employees'),
  getById: (id: string) => getById<Employee>('/db/employees', id),
  create: (employee: Omit<Employee, 'id'>) => api.post<Employee>('/db/employees', employee),
  update: (id: string, employee: Partial<Employee>) => updateById<Employee>('/db/employees', id, employee),
  delete: (id: string) => deleteById('/db/employees', id),
};

// Regions API
export const regionsApi = {
  getAll: () => api.get<Region[]>('/db/regions'),
  getById: (id: string) => getById<Region>('/db/regions', id),
  create: (region: Omit<Region, 'id'>) => api.post<Region>('/db/regions', region),
  update: (id: string, region: Partial<Region>) => updateById<Region>('/db/regions', id, region),
  delete: (id: string) => deleteById('/db/regions', id),
};

// PDVs API
export const pdvsApi = {
  getAll: () => api.get<PDV[]>('/db/pdvs'),
  getById: (id: string) => getById<PDV>('/db/pdvs', id),
  create: (pdv: Omit<PDV, 'id'>) => api.post<PDV>('/db/pdvs', pdv),
  update: (id: string, pdv: Partial<PDV>) => updateById<PDV>('/db/pdvs', id, pdv),
  delete: (id: string) => deleteById('/db/pdvs', id),
};

// Pipeline Stages API
export const stagesApi = {
  getAll: () => api.get<PipelineStage[]>('/db/stages'),
  getById: (id: string) => getById<PipelineStage>('/db/stages', id),
  create: (stage: Omit<PipelineStage, 'id'>) => api.post<PipelineStage>('/db/stages', stage),
  update: (id: string, stage: Partial<PipelineStage>) => updateById<PipelineStage>('/db/stages', id, stage),
  delete: (id: string) => deleteById('/db/stages', id),
};

// Tags API
export const tagsApi = {
  getAll: () => api.get<Tag[]>('/db/tags'),
  getById: (id: string) => getById<Tag>('/db/tags', id),
  create: (tag: Omit<Tag, 'id'>) => api.post<Tag>('/db/tags', tag),
  update: (id: string, tag: Partial<Tag>) => updateById<Tag>('/db/tags', id, tag),
  delete: (id: string) => deleteById('/db/tags', id),
};

// Dashboard API
export const dashboardApi = {
  getAll: () => api.get<DashboardWidget[]>('/db/widgets'),
  update: (widgets: DashboardWidget[]) => api.put<DashboardWidget[]>('/db/widgets', { widgets }),
  reset: () => api.post<DashboardWidget[]>('/db/widgets', { reset: true }),
};

// Custom Fields API
export const customFieldsApi = {
  getAll: () => api.get<CustomFieldDefinition[]>('/db/custom-fields'),
  getById: (id: string) => getById<CustomFieldDefinition>('/db/custom-fields', id),
  create: (field: Omit<CustomFieldDefinition, 'id'>) => api.post<CustomFieldDefinition>('/db/custom-fields', field),
  update: (id: string, field: Partial<CustomFieldDefinition>) => updateById<CustomFieldDefinition>('/db/custom-fields', id, field),
  delete: (id: string) => deleteById('/db/custom-fields', id),
};

// Integrations API
export const integrationsApi = {
  getAll: () => api.get<Integration[]>('/db/integrations'),
  getById: (id: string) => getById<Integration>('/db/integrations', id),
  create: (integration: Omit<Integration, 'id'>) => api.post<Integration>('/db/integrations', integration),
  update: (id: string, integration: Partial<Integration>) => updateById<Integration>('/db/integrations', id, integration),
  delete: (id: string) => deleteById('/db/integrations', id),
};

export const commercialDashboardApi = {
  getMetrics: (filters: CommercialDashboardFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.year) params.set('year', String(filters.year));
    if (typeof filters.month === 'number') params.set('month', String(filters.month));
    if (filters.period) params.set('period', filters.period);
    if (filters.regionId) params.set('regionId', filters.regionId);
    if (filters.pdvId) params.set('pdvId', filters.pdvId);
    if (filters.managerId) params.set('managerId', filters.managerId);
    if (filters.sellerId) params.set('sellerId', filters.sellerId);
    const query = params.toString();
    const endpoint = query.length > 0 ? `/db/commercial-dashboard?${query}` : '/db/commercial-dashboard';
    return api.get<CommercialDashboardMetrics>(endpoint);
  },
};

export { api };
