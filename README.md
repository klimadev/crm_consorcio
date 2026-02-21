# CRM Consorcio

CRM multi-tenant para vendas de consorcio, com Next.js + Prisma + SQLite.

## Requisitos

- Node.js 20+
- pnpm (recomendado)

## Ambiente

1. Instale dependencias:

```bash
pnpm install
```

2. Configure `.env`:

```env
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="troque-por-um-segredo-forte"
```

3. Gere o client do Prisma e sincronize o banco:

```bash
pnpm prisma generate
pnpm prisma db push
```

4. Popule dados de exemplo:

```bash
pnpm seed
```

Credenciais criadas no seed:

- Empresa: `empresa.demo@crmconsorcio.com` / `123456`
- Gerente: `gerente.demo@crmconsorcio.com` / `123456`
- Colaboradores: `colaborador1.demo@crmconsorcio.com` e `colaborador2.demo@crmconsorcio.com` / `123456`

## Scripts

- `pnpm lint`
- `pnpm build`
- `pnpm test`
- `pnpm seed`

## Validacao local recomendada

```bash
pnpm lint
pnpm test
pnpm build
```
