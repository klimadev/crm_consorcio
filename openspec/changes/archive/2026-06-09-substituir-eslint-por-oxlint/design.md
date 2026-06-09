## Context

O projeto usa ESLint v9 com `eslint-config-next/core-web-vitals` e `eslint-config-next/typescript` no `eslint.config.mjs`. O lint roda em Node.js (interpretado) e é o único tooling no pipeline que não usa Rust. oxlint (parte do projeto oxc) é um linter Rust que oferece 50-100x mais performance, com suporte nativo a regras Next.js, React, TypeScript, import, a11y e qualidade de código.

A abordagem será incremental: oxlint roda como linter primário para desenvolvimento diário, ESLint mantido como fallback para regras não cobertas.

## Goals / Non-Goals

**Goals:**
- Adicionar oxlint como linter rápido (Rust) para desenvolvimento diário
- Configurar regras equivalentes ao setup atual (`core-web-vitals` + `typescript`)
- Manter ESLint funcional para regras que oxlint ainda não cobre
- Adicionar script `lint:fast` rodando oxlint no package.json
- CI pode usar oxlint no lugar de ESLint (redução drástica de tempo)

**Non-Goals:**
- Remover ESLint completamente (mantido como fallback)
- Migrar formato de código (Prettier continua)
- Adicionar ferramentas adicionais (Biome, etc.)

## Decisions

### 1. oxlint em vez de Biome
- **Escolha**: oxlint
- **Razão**: oxlint tem suporte nativo a regras Next.js (`eslint-config-next`) e `@oxlint/migrate` para converter config existente automaticamente. Biome tem suporte a Next.js mas não tem a mesma compatibilidade com regras específicas.
- **Alternativa considerada**: Biome (rejeitado pois exigiria abandonar `eslint-config-next` completamente)

### 2. Abordagem incremental em vez de substituição total
- **Escolha**: Rodar oxlint e ESLint em paralelo
- **Razão**: Regras muito específicas do `eslint-config-next` (como `@next/next/no-html-link-for-pages`) podem não ter equivalente direto em oxlint. Manter ESLint como fallback garante zero regressão.
- **Alternativa considerada**: Substituição total (rejeitado por risco de perder regras)

### 3. Configuração via `.oxlintrc.json`
- **Escolha**: Arquivo de configuração estático na raiz
- **Razão**: oxlint usa formato JSON simples, sem plugins ou extends. Mais fácil de versionar e entender.

### 4. Script separado (`lint:fast`) em vez de substituir `lint`
- **Escolha**: `lint:fast` para oxlint, `lint` mantém ESLint
- **Razão**: Não quebrar CI/workflows existentes. Times podem migrar gradualmente.

## Risks / Trade-offs

- **Regras perdidas**: oxlint pode não cobrir 100% das regras do `eslint-config-next`. Mitigação: ESLint mantido como fallback; gap auditado após migração.
- **Config duplicada**: Manter dois linters significa duas configurações. Mitigação: `eslint-plugin-oxlint` desativa no ESLint as regras que oxlint já cobre.
- **Falso positivo**: oxlint pode ter regras mais agressivas. Mitigação: revisar e desabilitar regras problemáticas no `.oxlintrc.json`.
- **Ecosistema**: oxlint é mais novo que ESLint. Mitigação: comunidade ativa (oxc-project), suporte a Next.js já estabelecido.
