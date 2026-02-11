# Step 09 — Verification Plan

## Overview

This document outlines how to verify the Sales Validation & Installment Tracking module works correctly after implementation.

---

## 1. Build Verification

### Command
```bash
npm run build
```

### Expected Result
- Build succeeds with **zero errors**
- No TypeScript compilation issues
- All new files are properly imported and resolved

### What This Validates
- TypeScript types are correct
- All imports/exports are wired properly
- No circular dependencies introduced

---

## 2. Database Migration Verification

### Steps

1. **Delete existing database** (to test fresh creation):
   ```bash
   # Backup first
   cp data/database.db data/database.db.bak
   rm data/database.db
   ```

2. **Start the dev server**:
   ```bash
   npm run dev
   ```

3. **Verify table exists** — Open SQLite and check:
   ```bash
   # Using sqlite3 CLI or any SQLite browser
   sqlite3 data/database.db ".schema sales"
   ```

### Expected Result
- `sales` table exists with all columns
- Indexes `idx_sales_tenant_status`, `idx_sales_seller`, `idx_sales_deal` exist

---

## 3. API Endpoint Testing (Manual with cURL)

### Prerequisites
- Dev server running (`npm run dev`)
- Valid auth cookie (log in via browser first, then copy the `access_token` cookie)

### 3a. Create a Sale (POST)
```bash
curl -X POST http://localhost:3000/api/db/sales \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=<YOUR_TOKEN>" \
  -d '{
    "customerName": "Test Customer",
    "totalValue": 50000,
    "creditValue": 50000,
    "planMonths": 60,
    "notes": "Test sale",
    "installment1": { "dueDate": "2026-03-01", "value": 833 },
    "installment2": { "dueDate": "2026-04-01", "value": 833 },
    "installment3": { "dueDate": "2026-05-01", "value": 833 },
    "installment4": { "dueDate": "2026-06-01", "value": 833 }
  }'
```
**Expected**: 201 response with sale object, `consistencyStatus: "AWAITING_CONSISTENCY"`

### 3b. List Sales (GET)
```bash
curl http://localhost:3000/api/db/sales \
  -H "Cookie: access_token=<YOUR_TOKEN>"
```
**Expected**: Array containing the created sale

### 3c. Validate Sale — Mark as Consistent (POST)
```bash
curl -X POST http://localhost:3000/api/db/sales/validate \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=<YOUR_TOKEN>" \
  -d '{
    "saleId": "<SALE_ID_FROM_STEP_3a>",
    "status": "CONSISTENT",
    "notes": "All data verified"
  }'
```
**Expected**: Sale with `consistency_status: "CONSISTENT"`, `validated_by` populated

### 3d. Update Installment (PUT)
```bash
curl -X PUT http://localhost:3000/api/db/sales/installments \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=<YOUR_TOKEN>" \
  -d '{
    "saleId": "<SALE_ID>",
    "installmentNumber": 1,
    "status": "RECEIVED",
    "receivedDate": "2026-03-01"
  }'
```
**Expected**: Sale with `installment_1_status: "RECEIVED"`, `installment_1_received_date` populated

### 3e. Get Counts (GET)
```bash
curl "http://localhost:3000/api/db/sales?counts=true" \
  -H "Cookie: access_token=<YOUR_TOKEN>"
```
**Expected**: `{ "AWAITING_CONSISTENCY": 0, "CONSISTENT": 1, "INCONSISTENT": 0 }`

---

## 4. UI Verification (Browser Testing)

### Steps

1. **Start dev server**: `npm run dev`
2. **Login** as an ADMIN or MANAGER user
3. **Navigate** to the "Validação" tab in the sidebar

### 4a. Test Sale Submission
- Click "Nova Venda" button
- Fill in: Customer name, Total Value, Installment due dates and values
- Click Save
- **Verify**: Sale appears in the "Aguardando" tab with amber badge

### 4b. Test Validation Flow
- Click "Validar" on a pending sale card
- **Verify**: Modal opens showing sale details
- Enter validation notes and click "Consistente"
- **Verify**: Sale moves to the "Consistente" tab, badge counts update

### 4c. Test Inconsistency Flow
- Create another sale, then click "Validar"
- Click "Inconsistente" with a reason
- **Verify**: Sale moves to "Inconsistente" tab with red badge

### 4d. Test Installment Tracking
- On a CONSISTENT sale, click to expand installments
- Click "Mark as Received" on installment #1
- **Verify**: Status changes to green "Recebida" with received date

### 4e. Test RBAC
- Switch to a SALES_REP user (via user menu dropdown)
- **Verify**: Only "Nova Venda" button is visible, no "Validar" buttons
- **Verify**: SALES_REP only sees their own sales

---

## 5. Edge Case Testing

| Scenario | Expected Behavior |
|----------|-------------------|
| Edit a CONSISTENT sale | Should return 400 error "Cannot edit a validated sale" |
| Update installment on AWAITING sale | Should return 400 "Can only track installments on validated sales" |
| SALES_REP tries to validate | Should return 403 "Only managers can validate" |
| SUPPORT role on validation page | Should see the page but no action buttons |
| Delete sale as SALES_REP | Should return 403 |
| Create sale with missing customerName | Should return 400 |

---

## 6. Automated Testing (Future — Playwright)

The project has Playwright configured but no existing spec files. After manual verification, create:

### File: `tests/sales-validation.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Sales Validation Module', () => {
  test.beforeEach(async ({ page }) => {
    // Login as ADMIN
    await page.goto('/login');
    // ... login flow
  });

  test('should display Validação tab in sidebar', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Validação')).toBeVisible();
  });

  test('should create a new sale submission', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Validação').click();
    await page.getByText('Nova Venda').click();
    // Fill form...
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText('Aguardando Consistência')).toBeVisible();
  });

  test('should validate sale as consistent', async ({ page }) => {
    // ... create sale first, then validate
  });
});
```

### Command to Run
```bash
npx playwright test tests/sales-validation.spec.ts --headed
```

> **Note**: Full Playwright test implementation should be done after the UI is complete and manually verified. The test above is a template.
