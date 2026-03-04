# 02 — Stages & Seed Updates

> Affects: `src/lib/estagios-fixos.ts`, `prisma/seed.js`, `src/lib/tipos.ts`

---

## New Stage Definitions

The funnel goes from 5 → **7** stages:

| # | Stage Name | Type | Status |
|---|---|---|---|
| 1 | Indefinido | `ABERTO` | Existing |
| 2 | Em Atendimento | `ABERTO` | Existing |
| 3 | Proposta | `ABERTO` | Existing |
| **4** | **Pré Aprovação** | **`ABERTO`** | **NEW** |
| 5 | Fechado | `GANHO` | Existing (was ordem 4, now 5) |
| **6** | **Pós Vendas** | **`GANHO`** | **NEW** |
| 7 | Perdido | `PERDIDO` | Existing (was ordem 5, now 7) |

---

## File: `src/lib/estagios-fixos.ts`

### Change `ESTAGIOS_FIXOS_PADRAO`:

```diff
 export const ESTAGIOS_FIXOS_PADRAO = [
   { nome: "Indefinido", tipo: "ABERTO", ordem: 1 },
   { nome: "Em Atendimento", tipo: "ABERTO", ordem: 2 },
   { nome: "Proposta", tipo: "ABERTO", ordem: 3 },
-  { nome: "Fechado", tipo: "GANHO", ordem: 4 },
-  { nome: "Perdido", tipo: "PERDIDO", ordem: 5 },
+  { nome: "Pré Aprovação", tipo: "ABERTO", ordem: 4 },
+  { nome: "Fechado", tipo: "GANHO", ordem: 5 },
+  { nome: "Pós Vendas", tipo: "GANHO", ordem: 6 },
+  { nome: "Perdido", tipo: "PERDIDO", ordem: 7 },
 ] as const;
```

### `garantirEstagiosFixosEmpresa` function:

The current logic matches by `ordem` OR `nome` and upserts. This should continue working, but needs a consideration:

> **IMPORTANT**: Existing empresas have `Fechado` at `ordem: 4` and `Perdido` at `ordem: 5`. When migrating:
> - `Fechado` (ordem 4) will match by name and be updated to `ordem: 5`
> - `Perdido` (ordem 5) will match by name and be updated to `ordem: 7`
> - `Pré Aprovação` (ordem 4) won't match any existing record → will be **created**
> - `Pós Vendas` (ordem 6) won't match any existing record → will be **created**
>
> However, the `@@unique([id_empresa, ordem])` constraint means we need to run this in a careful order: first update `Perdido` to `ordem: 7`, then update `Fechado` to `ordem: 5`, then create `Pré Aprovação` at `ordem: 4` and `Pós Vendas` at `ordem: 6`.

**Recommendation**: Update `garantirEstagiosFixosEmpresa` to first delete stages that don't match any fixed stage by name, then process in two passes — update existing, then create new. Alternatively, process in reverse order of `ordem` to avoid unique constraint violations.

**Safest approach** — rewrite the migration function as:

```typescript
export async function garantirEstagiosFixosEmpresa(idEmpresa: string) {
  await prisma.$transaction(async (tx) => {
    // 1. Get all existing stages for this empresa
    const existentes = await tx.estagioFunil.findMany({
      where: { id_empresa: idEmpresa },
      orderBy: { ordem: "asc" },
    });

    // 2. Build a map by name for matching
    const mapaPorNome = new Map(existentes.map(e => [e.nome, e]));

    // 3. First pass: clear ordem on all existing to avoid unique constraint conflicts
    for (const existente of existentes) {
      await tx.estagioFunil.update({
        where: { id: existente.id },
        data: { ordem: existente.ordem + 1000 }, // temporary offset
      });
    }

    // 4. Second pass: upsert each fixed stage
    for (const estagioFixo of ESTAGIOS_FIXOS_PADRAO) {
      const existente = mapaPorNome.get(estagioFixo.nome);
      if (existente) {
        await tx.estagioFunil.update({
          where: { id: existente.id },
          data: {
            nome: estagioFixo.nome,
            tipo: estagioFixo.tipo,
            ordem: estagioFixo.ordem,
          },
        });
      } else {
        await tx.estagioFunil.create({
          data: {
            id_empresa: idEmpresa,
            nome: estagioFixo.nome,
            tipo: estagioFixo.tipo,
            ordem: estagioFixo.ordem,
          },
        });
      }
    }
  });

  return prisma.estagioFunil.findMany({
    where: { id_empresa: idEmpresa },
    orderBy: { ordem: "asc" },
  });
}
```

---

## File: `prisma/seed.js`

### Update `ESTAGIOS_PADRAO`:

```diff
 const ESTAGIOS_PADRAO = [
   { nome: "Indefinido", tipo: "ABERTO", ordem: 1 },
   { nome: "Em Atendimento", tipo: "ABERTO", ordem: 2 },
   { nome: "Proposta", tipo: "ABERTO", ordem: 3 },
-  { nome: "Fechado", tipo: "GANHO", ordem: 4 },
-  { nome: "Perdido", tipo: "PERDIDO", ordem: 5 },
+  { nome: "Pré Aprovação", tipo: "ABERTO", ordem: 4 },
+  { nome: "Fechado", tipo: "GANHO", ordem: 5 },
+  { nome: "Pós Vendas", tipo: "GANHO", ordem: 6 },
+  { nome: "Perdido", tipo: "PERDIDO", ordem: 7 },
 ];
```

### Update stage references in seed data:

The seed script references `estagio.ordem === 1`, `estagio.ordem === 3`, and `estagio.tipo === "GANHO"`. These references remain valid since:
- `Indefinido` stays at `ordem: 1` ✅
- `Proposta` stays at `ordem: 3` ✅
- `"GANHO"` type now matches `Fechado` (ordem 5) first via `find()` ✅

**Optionally**: Add a seed lead in "Pré Aprovação" to demonstrate the new stage.

---

## File: `src/lib/tipos.ts`

No changes needed. `TipoEstagioFunil = "ABERTO" | "GANHO" | "PERDIDO"` already covers all stage types.

---

## Grid Layout Consideration

Current board layout: `grid-cols-3 xl:grid-cols-5` (5 columns for 5 stages).

With 7 stages, update to: `grid-cols-3 xl:grid-cols-7` or use a horizontal scroll approach:

```diff
- <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
+ <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
```

Or use `overflow-x-auto` with `min-w-[200px]` columns for smaller screens.
