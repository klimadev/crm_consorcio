## Why

ESLint v9 com `eslint-config-next` é lento (JavaScript) e o lint é o único gargalo significativo no pipeline de desenvolvimento que ainda não usa tooling Rust. oxlint oferece 50-100x mais velocidade, suporte nativo a regras Next.js/React/TypeScript, e elimina a complexidade de gerenciar plugins ESLint.

## What Changes

- Adicionar `oxlint` como dependência dev
- Configurar `.oxlintrc.json` com regras equivalentes ao `eslint.config.mjs` atual
- Manter ESLint como fallback para regras não cobertas pelo oxlint (abordagem incremental)
- Adicionar script `lint:fast` rodando oxlint no `package.json`
- Atualizar documentação do fluxo de lint

## Capabilities

### New Capabilities
- `lint-rustico`: Linting via oxlint (Rust, 50-100x mais rápido), cobre regras Next.js, React, TypeScript, import, a11y, qualidade de código

### Modified Capabilities

(Nenhuma capability existente modificada)

## Impact

- **Dependências adicionadas**: `oxlint` (dev), `eslint-plugin-oxlint` (dev, opcional para coexistência)
- **Dependências removidas**: Nenhuma (ESLint mantido como fallback)
- **Configuração nova**: `.oxlintrc.json` na raiz
- **Scripts**: `lint:fast` adicionado ao `package.json`
- **Pipeline**: lint principal (`eslint`) continua existindo; `lint:fast` é o padrão para desenvolvimento diário
- **CI**: Pode substituir `eslint` por `oxlint` no CI para redução drástica de tempo
