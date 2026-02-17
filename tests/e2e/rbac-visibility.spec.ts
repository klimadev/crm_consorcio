import { test, expect } from '@playwright/test';

test('owner can access settings and leads views', async ({ page }) => {
  const unique = Date.now();
  const email = `rbac-${unique}@example.com`;

  await page.goto('/signup');
  await page.getByPlaceholder('Nome da empresa').fill('RBAC Corp');
  await page.getByPlaceholder('seu@email.com').fill(email);
  await page.getByPlaceholder('Senha').fill('StrongPassword123!');
  await page.getByRole('button', { name: 'Criar conta' }).click();

  await page.goto('/settings');
  await expect(page.getByText('PDVs')).toBeVisible();
  await page.goto('/leads');
  await expect(page.getByText('Create lead')).toBeVisible();
});
