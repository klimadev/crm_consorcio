import { test, expect } from '@playwright/test';

test('sales flow consistency validation', async ({ page }) => {
  const unique = Date.now();
  const slug = `flow-${unique}`;
  const email = `flow-${unique}@example.com`;

  await page.goto('/signup');
  await page.getByPlaceholder('Company name').fill('Flow Corp');
  await page.getByPlaceholder('company-slug').fill(slug);
  await page.getByPlaceholder('Owner full name').fill('Flow Owner');
  await page.getByPlaceholder('owner@company.com').fill(email);
  await page.getByPlaceholder('Strong password').fill('StrongPassword123!');
  await page.getByRole('button', { name: 'Create company' }).click();

  await page.goto('/leads');
  await page.getByPlaceholder('Lead title').fill('Lead One');
  await page.getByPlaceholder('Customer name').fill('Customer One');
  await page.getByRole('button', { name: 'Create' }).click();

  await page.getByText('Lead One').first().click();
  await page.getByRole('button', { name: 'Move to PROPOSAL' }).click();
  await page.getByRole('button', { name: 'Move to CONSISTENCY_CHECK' }).click();
  await expect(page.getByText('Missing required document')).toBeVisible();

  await page.getByRole('button', { name: 'Upload RG' }).click();
  await page.getByRole('button', { name: 'Upload CPF' }).click();
  await page.getByRole('button', { name: 'Upload CONTRACT' }).click();
  await page.getByRole('button', { name: 'Move to CONSISTENCY_CHECK' }).click();
  await expect(page.getByText('Consistency status: VALID')).toBeVisible();
});
