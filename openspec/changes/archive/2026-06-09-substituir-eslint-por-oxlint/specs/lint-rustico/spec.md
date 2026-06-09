## ADDED Requirements

### Requirement: Linting via oxlint
O sistema DEVE rodar oxlint como linter rápido (Rust) para verificação de código durante desenvolvimento.

#### Scenario: Executar oxlint via script npm
- **WHEN** o desenvolvedor executa `pnpm lint:fast`
- **THEN** o oxlint analisa todos os arquivos `.ts` e `.tsx` do projeto
- **THEN** o oxlint retorna código de saída 0 se nenhum erro for encontrado
- **THEN** o oxlint retorna código de saída 1 se erros forem encontrados

#### Scenario: Regras Next.js ativas
- **WHEN** o oxlint analisa um arquivo que viola regras Next.js (ex: `<a>` sem `href`)
- **THEN** o oxlint reporta o erro com a regra específica do Next.js

#### Scenario: Regras React ativas
- **WHEN** o oxlint analisa um arquivo que viola regras React (ex: hooks fora de componente)
- **THEN** o oxlint reporta o erro com a regra específica do React

#### Scenario: Regras TypeScript ativas
- **WHEN** o oxlint analisa um arquivo com erro de tipo detectável estaticamente
- **THEN** o oxlint reporta o erro com a regra específica do TypeScript

### Requirement: Coexistência com ESLint
O sistema DEVE manter ESLint funcional como fallback para regras não cobertas pelo oxlint.

#### Scenario: ESLint continua funcionando
- **WHEN** o desenvolvedor executa `pnpm lint`
- **THEN** o ESLint analisa todos os arquivos normalmente
- **THEN** o ESLint continua usando as regras `eslint-config-next/core-web-vitals` e `eslint-config-next/typescript`

#### Scenario: ESLint-plugin-oxlint evita duplicação
- **WHEN** oxlint está instalado e `eslint-plugin-oxlint` configurado
- **THEN** ESLint desativa regras que oxlint já cobre para evitar warnings duplicados

### Requirement: Configuração declarativa
O oxlint DEVE ser configurado via arquivo `.oxlintrc.json` na raiz do projeto.

#### Scenario: Configuração lida pelo oxlint
- **WHEN** oxlint é executado
- **THEN** ele lê a configuração do arquivo `.oxlintrc.json` na raiz
- **THEN** ele aplica as regras e categorias especificadas na configuração
