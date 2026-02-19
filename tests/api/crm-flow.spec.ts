import { test, expect, APIRequestContext } from '@playwright/test';

test.describe.serial('CRM API Complete Flow', () => {
  let uniqueId: string;
  let companySlug: string;
  let email: string;
  let employeeEmail: string;
  let customerEmail: string;
  const password = 'TestPassword123!';
  
  let apiContext: APIRequestContext;
  let companyId: string;
  let stageId: string;
  let pdvId: string;
  let employeeId: string;
  let customerId: string;
  let dealId: string;
  let sessionCookie: string;

  test.beforeAll(async ({ playwright }) => {
    uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    companySlug = `empresa-${uniqueId}`;
    email = `admin-${uniqueId}@empresa.com`;
    employeeEmail = `joao-${uniqueId}@empresa.com`;
    customerEmail = `cliente-${uniqueId}@teste.com`;
    
    apiContext = await playwright.request.newContext({
      baseURL: 'http://localhost:3000',
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('Complete CRM Flow', async () => {
    await test.step('1. Check slug availability', async () => {
      const response = await apiContext.get(`/api/public/slug-availability?slug=${companySlug}`);
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.data.available).toBe(true);
    });

    await test.step('2. Signup - create company', async () => {
      const companyName = `Empresa Teste ${uniqueId}`;
      const response = await apiContext.post('/api/public/signup', {
        data: {
          companyName,
          email,
          password,
          fullName: 'Admin Teste',
        },
      });
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data.data.companyId).toBeDefined();
      companyId = data.data.companyId;
      companySlug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    });

    await test.step('3. Login - get session', async () => {
      const csrfResponse = await apiContext.get('/api/auth/csrf');
      const csrfData = await csrfResponse.json();
      const csrfToken = csrfData.csrfToken;

      const loginResponse = await apiContext.post('/api/auth/callback/credentials', {
        form: {
          companySlug,
          email,
          password,
          csrfToken,
        },
        maxRedirects: 0,
      });

      expect([200, 302]).toContain(loginResponse.status());

      const setCookie = loginResponse.headers()['set-cookie'];
      expect(setCookie).toBeDefined();

      const cookieArray = Array.isArray(setCookie) ? setCookie : [setCookie];
      const found = cookieArray.find(c => c.includes('next-auth.session-token'));
      expect(found).toBeDefined();

      sessionCookie = found!.split(';')[0];
    });

    await test.step('4. Get current user', async () => {
      const response = await apiContext.get('/api/me', {
        headers: { Cookie: sessionCookie },
      });
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data.data.success).toBe(true);
      expect(data.data.user.email).toBe(email);
      expect(data.data.user.role).toBe('OWNER');
      expect(data.data.user.companyId).toBe(companyId);
    });

    await test.step('5. Get stages - should have 6 default stages', async () => {
      const response = await apiContext.get('/api/db/stages', {
        headers: { Cookie: sessionCookie },
      });
      
      expect(response.ok()).toBeTruthy();
      const stages = await response.json();
      
      expect(stages.length).toBe(6);
      expect(stages[0].name).toBe('Prospecção');
      expect(stages[0].type).toBe('OPEN');
      expect(stages[0].orderIndex).toBe(0);
      
      const wonStage = stages.find((s: any) => s.type === 'WON');
      expect(wonStage.name).toBe('Ganho');
      
      const lostStage = stages.find((s: any) => s.type === 'LOST');
      expect(lostStage.name).toBe('Perdido');
      
      stageId = stages[0].id;
    });

    await test.step('6. Create PDV', async () => {
      const response = await apiContext.post('/api/db/pdvs', {
        headers: { Cookie: sessionCookie },
        data: {
          name: 'PDV Centro',
          type: 'PHYSICAL_STORE',
          location: 'Rua Principal, 123',
        },
      });
      
      expect(response.ok()).toBeTruthy();
      const pdv = await response.json();
      
      expect(pdv.id).toBeDefined();
      expect(pdv.name).toBe('PDV Centro');
      expect(pdv.type).toBe('PHYSICAL_STORE');
      expect(pdv.is_active).toBe(true);
      
      pdvId = pdv.id;
    });

    await test.step('7. List PDVs', async () => {
      const response = await apiContext.get('/api/db/pdvs', {
        headers: { Cookie: sessionCookie },
      });
      
      expect(response.ok()).toBeTruthy();
      const pdvs = await response.json();
      
      expect(pdvs.length).toBe(1);
      expect(pdvs[0].id).toBe(pdvId);
      expect(pdvs[0].isActive).toBe(true);
    });

    await test.step('8. Create Employee', async () => {
      const response = await apiContext.post('/api/db/employees', {
        headers: { Cookie: sessionCookie },
        data: {
          name: 'João Vendedor',
          email: employeeEmail,
          password: 'Password123!',
          role: 'COLLABORATOR',
          pdvId,
        },
      });
      
      expect(response.ok()).toBeTruthy();
      const employee = await response.json();
      
      expect(employee.id).toBeDefined();
      expect(employee.name).toBe('João Vendedor');
      expect(employee.role).toBe('COLLABORATOR');
      expect(employee.pdv_id).toBe(pdvId);
      
      employeeId = employee.id;
    });

    await test.step('9. List Employees', async () => {
      const response = await apiContext.get('/api/db/employees', {
        headers: { Cookie: sessionCookie },
      });
      
      expect(response.ok()).toBeTruthy();
      const employees = await response.json();
      
      expect(employees.length).toBe(2);
      const collaborator = employees.find((e: any) => e.role === 'COLLABORATOR');
      expect(collaborator).toBeDefined();
      expect(collaborator.id).toBe(employeeId);
    });

    await test.step('10. Create Customer', async () => {
      const response = await apiContext.post('/api/db/customers', {
        headers: { Cookie: sessionCookie },
        data: {
          name: 'Cliente Teste',
          type: 'PF',
          document: '123.456.789-00',
          email: customerEmail,
          phone: '(11) 99999-9999',
          status: 'LEAD',
        },
      });
      
      expect(response.ok()).toBeTruthy();
      const customer = await response.json();
      
      expect(customer.id).toBeDefined();
      expect(customer.name).toBe('Cliente Teste');
      expect(customer.type).toBe('PF');
      expect(customer.status).toBe('LEAD');
      
      customerId = customer.id;
    });

    await test.step('11. List Customers', async () => {
      const response = await apiContext.get('/api/db/customers', {
        headers: { Cookie: sessionCookie },
      });
      
      expect(response.ok()).toBeTruthy();
      const customers = await response.json();
      
      expect(customers.length).toBe(1);
      expect(customers[0].id).toBe(customerId);
    });

    await test.step('12. Create Deal', async () => {
      const response = await apiContext.post('/api/db/deals', {
        headers: { Cookie: sessionCookie },
        data: {
          title: 'Cota Teste 123',
          customerId,
          customerName: 'Cliente Teste',
          value: 50000,
          stageId,
          pdvId,
        },
      });
      
      expect(response.ok()).toBeTruthy();
      const deal = await response.json();
      
      expect(deal.id).toBeDefined();
      expect(deal.title).toBe('Cota Teste 123');
      expect(deal.value).toBe(50000);
      
      dealId = deal.id;
    });

    await test.step('13. List Deals', async () => {
      const response = await apiContext.get('/api/db/deals', {
        headers: { Cookie: sessionCookie },
      });
      
      expect(response.ok()).toBeTruthy();
      const deals = await response.json();
      
      expect(deals.length).toBe(1);
      expect(deals[0].id).toBe(dealId);
      expect(deals[0].stageId).toBe(stageId);
      expect(deals[0].pdvId).toBe(pdvId);
    });

    await test.step('14. Update Deal - move to next stage', async () => {
      const stagesResponse = await apiContext.get('/api/db/stages', {
        headers: { Cookie: sessionCookie },
      });
      const stages = await stagesResponse.json();
      const nextStageId = stages[1].id;

      const response = await apiContext.put('/api/db/deals', {
        headers: { Cookie: sessionCookie },
        data: {
          id: dealId,
          title: 'Cota Teste 123 - Atualizada',
          value: 55000,
          stageId: nextStageId,
          customerId,
          pdvId,
          notes: 'Cliente interessado',
        },
      });
      
      expect(response.ok()).toBeTruthy();
      const deal = await response.json();
      
      expect(deal.value).toBe(55000);
      expect(deal.stage_id).toBe(nextStageId);
    });

    await test.step('15. Get Commercial Dashboard', async () => {
      const response = await apiContext.get('/api/db/commercial-dashboard', {
        headers: { Cookie: sessionCookie },
      });
      
      expect(response.ok()).toBeTruthy();
      const dashboard = await response.json();
      
      expect(dashboard.totalSalesCount).toBeDefined();
      expect(dashboard.totalSalesValue).toBeDefined();
      expect(dashboard.evolutionSeries).toBeDefined();
      expect(dashboard.ranking).toBeDefined();
      expect(dashboard.ranking.sellers).toBeDefined();
      expect(dashboard.ranking.managers).toBeDefined();
    });

    await test.step('16. Delete Deal', async () => {
      const response = await apiContext.delete(`/api/db/deals?id=${dealId}`, {
        headers: { Cookie: sessionCookie },
      });
      
      expect(response.ok()).toBeTruthy();
      
      const listResponse = await apiContext.get('/api/db/deals', {
        headers: { Cookie: sessionCookie },
      });
      const deals = await listResponse.json();
      expect(deals.length).toBe(0);
    });

    await test.step('17. Delete Employee', async () => {
      const response = await apiContext.delete(`/api/db/employees?id=${employeeId}`, {
        headers: { Cookie: sessionCookie },
      });
      
      expect(response.ok()).toBeTruthy();
      
      const listResponse = await apiContext.get('/api/db/employees', {
        headers: { Cookie: sessionCookie },
      });
      const employees = await listResponse.json();
      expect(employees.find((e: any) => e.id === employeeId)).toBeUndefined();
    });

    await test.step('18. Delete PDV', async () => {
      const response = await apiContext.delete(`/api/db/pdvs?id=${pdvId}`, {
        headers: { Cookie: sessionCookie },
      });
      
      expect(response.ok()).toBeTruthy();
      
      const listResponse = await apiContext.get('/api/db/pdvs', {
        headers: { Cookie: sessionCookie },
      });
      const pdvs = await listResponse.json();
      expect(pdvs.length).toBe(0);
    });
  });
});
