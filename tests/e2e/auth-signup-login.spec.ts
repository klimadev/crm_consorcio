import { test, expect } from '@playwright/test';

test('signup then login journey', async ({ page }) => {
  const unique = Date.now();
  const email = `owner-${unique}@example.com`;

  await page.goto('/signup');
  await page.getByPlaceholder('Nome da empresa').fill('Acme Consortium');
  await page.getByPlaceholder('seu@email.com').fill(email);
  await page.getByPlaceholder('Senha').fill('StrongPassword123!');
  await page.getByRole('button', { name: 'Criar conta' }).click();

  await expect(page).toHaveURL(/\/leads$/);
});
