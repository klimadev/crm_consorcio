import { Deal, Customer, Product, Employee, Region, PDV, PipelineStage, Tag, DashboardWidget, CustomFieldDefinition, Integration } from '@/types';

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
        console.warn(`Authentication required for ${endpoint}, returning empty data`);
        return [] as T; // Return empty array for 401 errors
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

// Deals API
export const dealsApi = {
  getAll: () => api.get<Deal[]>('/db/deals'),
  getById: (id: string) => api.get<Deal>(`/db/deals/${id}`),
  create: (deal: Omit<Deal, 'id'>) => api.post<Deal>('/db/deals', deal),
  update: (id: string, deal: Partial<Deal>) => api.put<Deal>(`/db/deals/${id}`, deal),
  delete: (id: string) => api.delete(`/db/deals/${id}`),
};

// Customers API
export const customersApi = {
  getAll: () => api.get<Customer[]>('/db/customers'),
  getById: (id: string) => api.get<Customer>(`/db/customers/${id}`),
  create: (customer: Omit<Customer, 'id'>) => api.post<Customer>('/db/customers', customer),
  update: (id: string, customer: Partial<Customer>) => api.put<Customer>(`/db/customers/${id}`, customer),
  delete: (id: string) => api.delete(`/db/customers/${id}`),
};

// Products API
export const productsApi = {
  getAll: () => api.get<Product[]>('/db/products'),
  getById: (id: string) => api.get<Product>(`/db/products/${id}`),
  create: (product: Omit<Product, 'id'>) => api.post<Product>('/db/products', product),
  update: (id: string, product: Partial<Product>) => api.put<Product>(`/db/products/${id}`, product),
  delete: (id: string) => api.delete(`/db/products/${id}`),
};

// Employees API
export const employeesApi = {
  getAll: () => api.get<Employee[]>('/db/employees'),
  getById: (id: string) => api.get<Employee>(`/db/employees/${id}`),
  create: (employee: Omit<Employee, 'id'>) => api.post<Employee>('/db/employees', employee),
  update: (id: string, employee: Partial<Employee>) => api.put<Employee>(`/db/employees/${id}`, employee),
  delete: (id: string) => api.delete(`/db/employees/${id}`),
};

// Regions API
export const regionsApi = {
  getAll: () => api.get<Region[]>('/db/regions'),
  getById: (id: string) => api.get<Region>(`/db/regions/${id}`),
  create: (region: Omit<Region, 'id'>) => api.post<Region>('/db/regions', region),
  update: (id: string, region: Partial<Region>) => api.put<Region>(`/db/regions/${id}`, region),
  delete: (id: string) => api.delete(`/db/regions/${id}`),
};

// PDVs API
export const pdvsApi = {
  getAll: () => api.get<PDV[]>('/db/pdvs'),
  getById: (id: string) => api.get<PDV>(`/db/pdvs/${id}`),
  create: (pdv: Omit<PDV, 'id'>) => api.post<PDV>('/db/pdvs', pdv),
  update: (id: string, pdv: Partial<PDV>) => api.put<PDV>(`/db/pdvs/${id}`, pdv),
  delete: (id: string) => api.delete(`/db/pdvs/${id}`),
};

// Pipeline Stages API
export const stagesApi = {
  getAll: () => api.get<PipelineStage[]>('/db/stages'),
  getById: (id: string) => api.get<PipelineStage>(`/db/stages/${id}`),
  create: (stage: Omit<PipelineStage, 'id'>) => api.post<PipelineStage>('/db/stages', stage),
  update: (id: string, stage: Partial<PipelineStage>) => api.put<PipelineStage>(`/db/stages/${id}`, stage),
  delete: (id: string) => api.delete(`/db/stages/${id}`),
};

// Tags API
export const tagsApi = {
  getAll: () => api.get<Tag[]>('/db/tags'),
  getById: (id: string) => api.get<Tag>(`/db/tags/${id}`),
  create: (tag: Omit<Tag, 'id'>) => api.post<Tag>('/db/tags', tag),
  update: (id: string, tag: Partial<Tag>) => api.put<Tag>(`/db/tags/${id}`, tag),
  delete: (id: string) => api.delete(`/db/tags/${id}`),
};

// Dashboard API
export const dashboardApi = {
  getAll: () => api.get<DashboardWidget[]>('/db/widgets'),
  update: (widgets: DashboardWidget[]) => api.put<DashboardWidget[]>('/db/widgets', { widgets }),
};

// Custom Fields API
export const customFieldsApi = {
  getAll: () => api.get<CustomFieldDefinition[]>('/db/custom-fields'),
  getById: (id: string) => api.get<CustomFieldDefinition>(`/db/custom-fields/${id}`),
  create: (field: Omit<CustomFieldDefinition, 'id'>) => api.post<CustomFieldDefinition>('/db/custom-fields', field),
  update: (id: string, field: Partial<CustomFieldDefinition>) => api.put<CustomFieldDefinition>(`/db/custom-fields/${id}`, field),
  delete: (id: string) => api.delete(`/db/custom-fields/${id}`),
};

// Integrations API
export const integrationsApi = {
  getAll: () => api.get<Integration[]>('/db/integrations'),
  getById: (id: string) => api.get<Integration>(`/db/integrations/${id}`),
  create: (integration: Omit<Integration, 'id'>) => api.post<Integration>('/db/integrations', integration),
  update: (id: string, integration: Partial<Integration>) => api.put<Integration>(`/db/integrations/${id}`, integration),
  delete: (id: string) => api.delete(`/db/integrations/${id}`),
};

export { api };