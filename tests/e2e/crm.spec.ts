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
      await expect(page.locator('text=Email, senha e organização são obrigatórios')).toBeVisible();
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
      await expect(page.locator('text=Funil Operacional')).toBeVisible({ timeout: 10000 });
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
      await expect(page.locator('h3:has-text("Prospecção / Lead")')).toBeVisible();
      await expect(page.locator('h3:has-text("Simulação Enviada")')).toBeVisible();
      await expect(page.locator('h3:has-text("Adesão Confirmada")')).toBeVisible();
    });

    test('should navigate between views', async ({ page }) => {
      await page.click('button:has-text("Dashboard")');
      await expect(page.locator('text=Dashboard Comercial')).toBeVisible({ timeout: 5000 });
      
      await page.click('button:has-text("Kanban")');
      await expect(page.locator('text=Funil Operacional')).toBeVisible();
    });

    test('should open new deal modal', async ({ page }) => {
      const newCardBtn = page.getByRole('button', { name: 'Nova Cota' }).first();
      await newCardBtn.click();
      await expect(page.locator('h2:has-text("Nova Cota")')).toBeVisible({ timeout: 5000 });
      
      await page.keyboard.press('Escape');
      await expect(page.locator('h2:has-text("Nova Cota")')).toBeHidden();
    });

    test('should display deal cards', async ({ page }) => {
      const dealCards = page.locator('text=Renovação Frota Translog');
      await expect(dealCards.first()).toBeVisible();
    });

    test('should filter deals', async ({ page }) => {
      await page.fill('input[placeholder="Buscar consorciado, cota..."]', 'Translog');
      await expect(page.locator('text=Renovação Frota Translog')).toBeVisible();
      
      await page.click('button:has-text("Limpar")');
      await expect(page.locator('text=Renovação Frota Translog')).toBeVisible();
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
      await page.click('button:has-text("Consorciados")');
      await expect(page.locator('text=Consorciados')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=Translog Transportes Ltda')).toBeVisible();
    });
  });

  test.describe('API Endpoints', () => {
    test('should return 401 for protected API without auth', async ({ request }) => {
      const response = await request.get('/api/auth/me');
      expect(response.status()).toBe(401);
    });
  });
});
