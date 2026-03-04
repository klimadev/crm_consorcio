# 01 — Prisma Schema Changes

> All changes are in `prisma/schema.prisma`, affecting the `Lead` model only.

---

## New Fields on `Lead`

Add two nullable columns to support the management approval workflow:

```diff
 model Lead {
   id                      String             @id @default(uuid())
   id_empresa              String
   id_funcionario          String
   id_estagio              String
   nome                    String
   telefone                String
   valor_consorcio         Float
   observacoes             String?
   motivo_perda            String?
   criado_em               DateTime           @default(now())
   atualizado_em           DateTime           @default(now()) @updatedAt
   documento_aprovacao_url String?
   origem                  String             @default("MANUAL")
+  aprovado_em             DateTime?
+  aprovado_por            String?
   estagio                 EstagioFunil       @relation(fields: [id_estagio], references: [id])
   funcionario             Funcionario        @relation(fields: [id_funcionario], references: [id])
   empresa                 Empresa            @relation(fields: [id_empresa], references: [id])
   pendencias              Pendencia[]
   whatsapp_mensagens      WhatsappMensagem[]

   @@index([id_empresa])
   @@index([id_funcionario])
   @@index([id_estagio])
 }
```

### Field Details

| Field | Type | Purpose |
|---|---|---|
| `aprovado_em` | `DateTime?` | Timestamp of when a EMPRESA/ADMINISTRADOR/GERENTE approved the lead. `null` means not yet approved. |
| `aprovado_por` | `String?` | The `id` of the user (Funcionario or Empresa) who clicked "Aprovar Lead". `null` means not yet approved. |

### Why nullable?

- Existing leads won't have approval data and migration must be non-breaking.
- Only leads that pass through "Pré Aprovação" will ever have these set.
- When a lead is moved back (e.g., from "Fechado" to an earlier stage), these fields should be reset to `null`.

---

## Migration Command

```bash
npx prisma migrate dev --name add_lead_approval_fields
```

This generates a new SQLite migration adding the two nullable columns. No data loss. Fully backwards-compatible.

---

## TypeScript Type Impact

After running `npx prisma generate`, the Prisma client's `Lead` type will automatically include:

```ts
aprovado_em: Date | null;
aprovado_por: string | null;
```

The frontend `Lead` type in `src/modules/kanban/types.ts` must also be updated to match:

```diff
 export type Lead = {
   id: string;
   id_estagio: string;
   id_funcionario: string;
   nome: string;
   telefone: string;
   valor_consorcio: number;
   observacoes: string | null;
   motivo_perda: string | null;
   documento_aprovacao_url: string | null;
   origem?: "MANUAL" | "SINCRONIZACAO_WHATSAPP" | string;
   atualizado_em: string;
+  aprovado_em: string | null;
+  aprovado_por: string | null;
 };
```

> Note: Dates come as ISO strings from the API, hence `string | null` on the frontend.
