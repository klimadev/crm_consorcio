## 1. Instalação e Configuração

- [x] 1.1 Instalar `oxlint` como dependência dev (`pnpm add -D oxlint`)
- [x] 1.2 Criar `.oxlintrc.json` na raiz com regras equivalentes ao setup atual (Next.js, React, TypeScript)
- [x] 1.3 Adicionar script `lint:fast` no `package.json` rodando `oxlint`
- [x] 1.4 Verificar execução: `pnpm lint:fast` analisa arquivos

## 2. Coexistência com ESLint

- [x] 2.1 Instalar `eslint-plugin-oxlint` como dependência dev
- [x] 2.2 Atualizar `eslint.config.mjs` para incluir plugin e desativar regras cobertas pelo oxlint
- [x] 2.3 Verificar que `pnpm lint` (ESLint) continua funcionando sem duplicação de regras

## 3. Validação

- [x] 3.1 Rodar `pnpm lint:fast` em todo o código-fonte (warnings existentes não bloqueiam)
- [x] 3.2 Rodar `pnpm lint` (ESLint) para garantir zero regressão
- [x] 3.3 Verificar que build continua funcionando (`pnpm build`)
