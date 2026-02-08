# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/spec/v2.0.0.html).

## [1.1.0] - 2026-02-08

### Adicionado
- Novo componente `CommercialFilters` para filtragem avançada de dados comerciais
- Nova API route `/api/db/commercial-dashboard` para dados do dashboard comercial
- Novos tipos TypeScript para suporte às funcionalidades comerciais
- Funções de operações de banco de dados em `lib/db/operations.ts`

### Modificado
- `DashboardBI`: Refatoração completa com 682 linhas alteradas para melhor performance
- `SettingsViews`: Adicionadas 43 linhas com novas configurações
- `services/api.ts`: Atualizações nos endpoints da API
- `types/index.ts`: Expandido com 48 novas linhas de tipos
- `next-env.d.ts`: Atualizado path de types do Next.js

### Removido
- Removida rota de autenticação NextAuth: `api/auth/[...nextauth]/route.ts`

## [1.0.0] - 2026-02-08

### Adicionado
- Lançamento inicial do CRM-next
- Dashboard com BI integrado
- Sistema Kanban para pipeline de vendas
- Gestão de clientes
- Integração com Google Gemini AI
- Sistema de autenticação com JWT
- Suporte a RBAC (ADMIN, MANAGER, SALES_REP, SUPPORT)
- Persistência via LocalStorage
- Next.js 16 com Turbopack
- React 19
- Tailwind CSS
