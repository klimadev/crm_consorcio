# 02 — Prisma Schema Update

## File: `prisma/schema.prisma`

### New Model: `Parcela`

Add the following model **after** the existing `Pendencia` model (around line 149):

```prisma
model Parcela {
  id               String    @id @default(uuid())
  id_empresa       String
  id_lead          String
  numero_parcela   Int
  quantidade_total Int
  valor            Float
  data_vencimento  DateTime
  data_pagamento   DateTime?
  status           String    @default("PENDENTE") // PENDENTE | PAGO | ATRASADO
  criado_em        DateTime  @default(now())
  atualizado_em    DateTime  @default(now()) @updatedAt

  lead    Lead    @relation(fields: [id_lead], references: [id], onDelete: Cascade)
  empresa Empresa @relation(fields: [id_empresa], references: [id])

  @@unique([id_lead, numero_parcela])
  @@index([id_empresa])
  @@index([id_lead])
  @@index([id_empresa, status])
  @@index([id_empresa, data_vencimento])
}
```

### Existing Model Updates

#### `Lead` model — add relation:

```diff
 model Lead {
   ...
   pendencias              Pendencia[]
   whatsapp_mensagens      WhatsappMensagem[]
+  parcelas                Parcela[]
   ...
 }
```

#### `Empresa` model — add relation:

```diff
 model Empresa {
   ...
   pdvs          Pdv[]
+  parcelas      Parcela[]
 }
```

### Migration

After editing the schema, run:

```bash
npx prisma migrate dev --name add_parcela_model
npx prisma generate
```

### Design Notes

| Decision | Rationale |
|----------|-----------|
| `@@unique([id_lead, numero_parcela])` | Prevents duplicate installment numbers per lead |
| `onDelete: Cascade` on Lead relation | If lead is deleted, all parcelas are deleted too |
| `status` stored as String (not Enum) | SQLite doesn't support native enums; keeping consistent with existing pattern (e.g. `Lead.origem`) |
| `@@index([id_empresa, data_vencimento])` | Optimizes the Financial Dashboard query for upcoming/overdue parcelas |
| `@@index([id_empresa, status])` | Optimizes filtering by status on the dashboard |
| `data_pagamento` nullable | Only populated when paid; null means unpaid |
| Status `ATRASADO` | Dynamically computed: stored as `PENDENTE`, but displayed as `ATRASADO` when `data_vencimento < today && !data_pagamento`. The API can also batch-update the stored field if desired. |
