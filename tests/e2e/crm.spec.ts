import { test, expect } from '@playwright/test';

test.describe('CRM Next E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test.describe('Login Page', () => {
    test('should display login form', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('MC I CRM');
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toContainText('Entrar');
    });

    test('should show error for empty fields', async ({ page }) => {
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Email e senha são obrigatórios')).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.fill('input[placeholder="sua-empresa"]', 'demo');
      await page.fill('input[type="email"]', 'wrong@email.com');
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Credenciais inválidas')).toBeVisible();
    });
  });

  test.describe('Authentication Flow', () => {
    test('should login successfully with valid credentials', async ({ page }) => {
      await page.fill('input[placeholder="sua-empresa"]', 'demo');
      await page.fill('input[type="email"]', 'admin@mc.com');
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL('/');
      await expect(page.locator('h1')).toContainText('kanban', { timeout: 10000 });
    });

    test('should redirect to login when accessing protected page without auth', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Kanban Board', () => {
    test.beforeEach(async ({ page }) => {
      await page.fill('input[placeholder="sua-empresa"]', 'demo');
      await page.fill('input[type="email"]', 'admin@mc.com');
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');
    });

    test('should display Kanban board with stages', async ({ page }) => {
      await expect(page.locator('text=Funil Operacional')).toBeVisible();
      await expect(page.locator('h3:has-text("Prospecção")')).toBeVisible();
      await expect(page.locator('h3:has-text("Qualificação")')).toBeVisible();
      await expect(page.locator('h3:has-text("Vendido")')).toBeVisible();
    });

    test('should navigate between views', async ({ page }) => {
      await page.click('button:has-text("Dashboard")');
      await expect(page.locator('text=Funil de Vendas')).toBeVisible({ timeout: 5000 });
      
      await page.click('button:has-text("Funil (Kanban)")');
      await expect(page.locator('h3:has-text("Prospecção")')).toBeVisible();
    });

    test('should open new deal modal', async ({ page }) => {
      const newCardBtn = page.getByRole('button', { name: 'Novo Card' }).first();
      await newCardBtn.click();
      await expect(page.locator('h2:has-text("Novo Negócio")')).toBeVisible({ timeout: 5000 });
      
      await page.keyboard.press('Escape');
      await expect(page.locator('h2:has-text("Novo Negócio")')).toBeHidden();
    });

    test('should display deal cards', async ({ page }) => {
      const dealCards = page.locator('text=Frota Agro Sul');
      await expect(dealCards.first()).toBeVisible();
    });

    test('should filter deals', async ({ page }) => {
      await page.fill('input[placeholder="Buscar cliente, título..."]', 'Frota');
      await expect(page.locator('text=Frota Agro Sul')).toBeVisible();
      
      await page.click('button:has-text("Limpar")');
      await expect(page.locator('text=Frota Agro Sul')).toBeVisible();
    });
  });

  test.describe('Customers Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.fill('input[placeholder="sua-empresa"]', 'demo');
      await page.fill('input[type="email"]', 'admin@mc.com');
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');
    });

    test('should navigate to customers', async ({ page }) => {
      await page.click('button:has-text("Clientes")');
      await expect(page.locator('text=Carteira de Clientes')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=Tech Solutions PJ')).toBeVisible();
    });
  });

  test.describe('API Endpoints', () => {
    test('should return 401 for protected API without auth', async ({ request }) => {
      const response = await request.get('/api/auth/me');
      expect(response.status()).toBe(401);
    });
  });
});
