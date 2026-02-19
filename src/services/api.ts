import type {
  CommercialDashboardFilters,
  CommercialDashboardMetrics,
  Customer,
  Deal,
  LeadStage,
  Employee,
  PDV,
  PipelineStage,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

type JsonRecord = Record<string, unknown>;

class ApiClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      credentials: 'include', // IMPORTANTE: incluir cookies em todas as requisições
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      if (response.status === 401) {
        return null as T;
      }
      // Tenta extrair mensagem de erro do corpo da resposta
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;
      try {
        const errorBody = await response.json();
        if (errorBody?.error) {
          errorMessage = typeof errorBody.error === 'string' 
            ? errorBody.error 
            : errorBody.error.message || errorMessage;
        }
      } catch {
        // Ignora erro de parsing do corpo
      }
      throw new Error(errorMessage);
    }

    return response.json() as Promise<T>;
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint);
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
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

export const dealsApi = {
  getAll: () => api.get<Deal[]>('/db/deals'),
  getById: (id: string) => getById<Deal>('/db/deals', id),
  create: (deal: Omit<Deal, 'id'>) => api.post<Deal>('/db/deals', deal),
  update: (id: string, deal: Partial<Deal>) => updateById<Deal>('/db/deals', id, deal),
  delete: (id: string) => deleteById('/db/deals', id),
};

export const customersApi = {
  getAll: () => api.get<Customer[]>('/db/customers'),
  getById: (id: string) => getById<Customer>('/db/customers', id),
  create: (customer: Omit<Customer, 'id'>) => api.post<Customer>('/db/customers', customer),
  update: (id: string, customer: Partial<Customer>) => updateById<Customer>('/db/customers', id, customer),
  delete: (id: string) => deleteById('/db/customers', id),
};

export const employeesApi = {
  getAll: () => api.get<Employee[]>('/db/employees'),
  getById: (id: string) => getById<Employee>('/db/employees', id),
  create: (employee: Omit<Employee, 'id'>) => api.post<Employee>('/db/employees', employee),
  update: (id: string, employee: Partial<Employee>) => updateById<Employee>('/db/employees', id, employee),
  delete: (id: string) => deleteById('/db/employees', id),
};

export const pdvsApi = {
  getAll: () => api.get<PDV[]>('/db/pdvs'),
  getById: (id: string) => getById<PDV>('/db/pdvs', id),
  create: (pdv: Omit<PDV, 'id'>) => api.post<PDV>('/db/pdvs', pdv),
  update: (id: string, pdv: Partial<PDV>) => updateById<PDV>('/db/pdvs', id, pdv),
  delete: (id: string) => deleteById('/db/pdvs', id),
};

export const stagesApi = {
  getAll: () => api.get<PipelineStage[]>('/db/stages'),
  getById: (id: string) => getById<PipelineStage>('/db/stages', id),
  create: (stage: Omit<PipelineStage, 'id'>) => api.post<PipelineStage>('/db/stages', stage),
  update: (id: string, stage: Partial<PipelineStage>) => updateById<PipelineStage>('/db/stages', id, stage),
  delete: (id: string) => deleteById('/db/stages', id),
};

export const commercialDashboardApi = {
  getMetrics: (filters: CommercialDashboardFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.year) params.set('year', String(filters.year));
    if (typeof filters.month === 'number') params.set('month', String(filters.month));
    if (filters.period) params.set('period', filters.period);
    if (filters.pdvId) params.set('pdvId', filters.pdvId);
    if (filters.managerId) params.set('managerId', filters.managerId);
    if (filters.sellerId) params.set('sellerId', filters.sellerId);
    const query = params.toString();
    const endpoint = query.length > 0 ? `/db/commercial-dashboard?${query}` : '/db/commercial-dashboard';
    return api.get<CommercialDashboardMetrics>(endpoint);
  },
};

export const authApi = {
  signup: (payload: { companyName: string; email: string; password: string }) =>
    api.post<{ companyId: string; ownerMembershipId: string }>('/public/signup', payload),
};

export const pdvApi = {
  list: () => api.get<Array<{ id: string; name: string }>>('/pdvs'),
  create: (payload: { name: string }) => api.post<{ id: string; name: string }>('/pdvs', payload),
  update: (payload: { id: string; name?: string; isActive?: boolean }) =>
    api.patch<{ id: string; name: string }>('/pdvs', payload),
};

export const teamApi = {
  list: () => api.get<Array<{ id: string; name: string; pdvId: string | null }>>('/teams'),
  create: (payload: { name: string; pdvId?: string }) =>
    api.post<{ id: string; name: string; pdvId: string | null }>('/teams', payload),
  update: (payload: { id: string; name?: string; pdvId?: string | null; isActive?: boolean }) =>
    api.patch<{ id: string; name: string; pdvId: string | null }>('/teams', payload),
};

export const leadApi = {
  list: () =>
    api.get<Array<{ id: string; title: string; customerName: string; stage: LeadStage; consistencyStatus: 'PENDING' | 'VALID' | 'INCONSISTENT' }>>('/leads'),
  create: (payload: JsonRecord) => api.post('/leads', payload),
  details: (leadId: string) =>
    api.get<{ stage: LeadStage; consistencyStatus: 'PENDING' | 'VALID' | 'INCONSISTENT'; consistencyIssues: string[] }>(
      `/leads/${leadId}`
    ),
  moveStage: (leadId: string, payload: { nextStage: LeadStage }) => api.post(`/leads/${leadId}/stage`, payload),
  uploadDocument: (leadId: string, payload: { documentType: 'RG' | 'CPF' | 'CONTRACT'; fileName: string }) =>
    api.post(`/leads/${leadId}/documents`, payload),
};

export { api };
