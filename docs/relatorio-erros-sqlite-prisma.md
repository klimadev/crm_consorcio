# Relatório: erros "Unable to open the database file" (Prisma + SQLite)

**Projeto:** mc-consorcio-crm · **Banco:** SQLite (`file:./prisma/dev.db`) · **Prisma:** 5.22.0 · **Ambientes com erro:** `next dev` (Turbopack) e Edge Middleware, Windows

---

## Conclusão (primeiro)

Os erros não são do `lead.findMany()` nem do `funcionario.findUnique()`. São de **inicialização do cliente Prisma** em `src/lib/prisma.ts`: PRAGMAs de otimização SQLite rodam no carregamento do módulo, encontram o banco bloqueado (`SQLITE_CANTOPEN`, código 14), relançam o erro e deixam a variável de single-flight nula — de modo que cada nova importação re-tenta e falha. Como importar `@/lib/prisma` é obrigatório em toda rota e página, a falha se espalha para `funcionario.findUnique`, `lead.findMany`, etc.

**Correção:** `src/lib/prisma.ts` passa a nunca lançar na inicialização, remove qualquer import de módulos Node (`node:fs`/`node:path`) do topo do arquivo (era quebrando o Edge Middleware), coloca `busy_timeout` primeiro e aplica PRAGMAs de forma não destrutiva — falhas são absorvidas silenciosamente. Nenhuma rota precisa mudar. Testes em `src/lib/prisma.test.ts` travam o comportamento.

---

## O que os erros dizem

| Onde | Operação | Erro |
|---|---|---|
| `src/lib/prisma.ts:29` | `prisma.\$queryRaw(PRAGMA journal_mode = WAL)` | Error code 14: Unable to open the database file (`PrismaClientInitializationError`) |
| SSR `/resumo` | `prisma.funcionario.findUnique()` | Error querying the database: Error code 14 |
| `src/app/api/resumo/route.ts:93` | `prisma.lead.findMany()` | Error querying the database: Error code 14 (500) |
| `src/app/api/pendencias` | `prisma.lead.findMany()` (via `detectarPendenciasDinamicas`) | 500 |

Padrão: todos partem de `src/lib/prisma.ts`; todos são o mesmo erro 14.

---

## Por que acontece (causa raiz)

### 1. PRAGMA no carregamento do módulo, antes de qualquer conexão

`src/lib/prisma.ts` chama `ensureSqliteOptimizations()` no escopo do módulo (linhas 46–50). A primeira coisa que faz é `PRAGMA journal_mode = WAL`, que exige criar `dev.db-wal` e `dev.db-shm` no diretório do banco. Sob `next dev` no Windows:

- Vários workers do Turbopack e recarregamentos a cada alteração de arquivo abrem o **mesmo** `dev.db` simultaneamente;
- SQLite usa bloqueio de arquivo no Windows; um processo com o WAL ativo bloqueia a abertura por outro;
- Resultado: `SQLITE_CANTOPEN` (código 14).

O banco existe (22 MB) — o problema não é falta de arquivo, é **concorrência de abertura sobre um arquivo bloqueado**.

### 2. A falha envenena todas as importações subsequentes

Fluxo atual (linhas 27–40):

```ts
if (!sqliteOptimizationsPromise) {
  sqliteOptimizationsPromise = (async () => {
    await prisma.$queryRaw(Prisma.sql`PRAGMA journal_mode = WAL`);
    ...
  })()
    .catch((erro) => {
      sqliteOptimizationsPromise = null;   // <- volta a null: tenta de novo na próxima importação
      console.error("Erro ao aplicar otimizações SQLite:", erro);
      throw erro;                          // <- relança: falha é visível fora do módulo
    });
}
return sqliteOptimizationsPromise;
```

- Primeira falha: zera a promise e lança.
- Toda nova importação de `@/lib/prisma` re-executa o side effect de nível de módulo → re-tenta os PRAGMAs → falha de novo.
- Tempestade de erros a cada recarregamento do dev server; as páginas/APIs que importam o cliente herdam a exceção e quebram consultas que antes funcionariam (default journal mode ainda funciona sem WAL).

### 3. Sem retry real e sem isolamento

O `catch` relança em vez de absorver a falha de otimização. O cliente Prisma continua funcional para consultas comuns — o que quebra é apenas a inicialização otimizadora. Não há motivo para derrubar a aplicação por isso.

---

## Por que `funcionario.findUnique` e `lead.findMany` também falham

Elas não falham por erro próprio. Falham porque:

1. Importar `@/lib/prisma` dispara `ensureSqliteOptimizations()` no escopo do módulo;
2. Esse side effect lança com CANTOPEN;
3. A requisição cai antes de chegar na consulta real.

O stack trace aponta na consulta, mas a causa está na importação do cliente.

---

## Correção limpa (o que muda)

Arquivo: `src/lib/prisma.ts`. Nenhuma outra rotina de negócio muda.

### a) Nunca lançar na inicialização

`ensureSqliteOptimizations()` retorna uma promise que **sempre resolve**. Falha de PRAGMA é logada uma vez e absorvida. Sem `throw`, sem retry infinito, sem envenenamento de outras consultas.

### b) Sem modulos Node no topo (Edge-safe)

A versao anterior importava `node:fs` e `node:path` no topo do arquivo, o que quebrava o **Edge Middleware** (`Next.js` rejeita modulos Node no Edge Runtime). A correcao remove esses imports completamente. `garantirDiretorioSqlite()` mantida como no-op: o diretorio `prisma/` ja existe no repositorio e o Erro 14 e contecao de arquivo no Windows, nao falta de diretorio.

### c) `busy_timeout` primeiro, PRAGMAs isoladas e em paralelo

`PRAGMA busy_timeout = 15000` e aplicado primeiro, para as proximas PRAGMAs aguardarem o desbloqueio em vez de falhar imediatamente. Cada PRAGMA roda em seu proprio `$queryRawUnsafe` com try/catch individual, executadas via `Promise.all`: uma falha nao impede as outras e nao propaga.

### d) Single-flight preservado, mas resolvendo também em falha

Uma única execução por instância; depois de concluída (sucesso ou falha absorvida), chamadas seguintes retornam a promise já resolvida — nenhuma tempestade de tentativas.

### e) Rotas não precisam mudar

`api/resumo/route.ts`, `api/pendencias/route.ts` e as rotas de WhatsApp já envolvem as consultas em try/catch ou chamam `ensureSqliteOptimizations()` antes de usar o banco. Com o módulo não lançando mais, essas rotas passam a iniciar sem 500 de inicialização.

---

## Como foi aplicado (TDD, skill tdd)

Ciclo red → green → refactor em `src/lib/prisma.test.ts`:

1. **Red:** testes escritos antes da correção — falham porque as funções alvo não existem ou lançam:
   - `aplicarOtimizacoesSqlite()` com mock que rejeita `Error code 14` deve resolver, não lançar.
   - `garantirDiretorioSqlite()` retorna `undefined` para qualquer URL (no-op seguro no Edge).
   - `ensureSqliteOptimizations()` com banco real (`dev.db`) deve resolver (regressão).
2. **Green:** implementar o mínimo em `src/lib/prisma.ts` para cada teste passar.
3. **Verificação:** `npm run test` (vitest), `npm run lint:fast` (oxlint), e smoke de importação do módulo com banco inacessível.

---

## Como verificar

```bash
# testes da correção
npm run test -- src/lib/prisma.test.ts

# lint rápido do projeto (regras do AGENTS.md: oxlint, nunca tsc)
npm run lint:fast

# smoke: iniciar dev e acessar /resumo e /api/resumo?periodo=mensal
npm run dev
```

Critério de sucesso: sem `PrismaClientInitializationError` / `Error code 14` nos logs do servidor; `GET /api/resumo` e `GET /api/pendencias` retornam 200 com dados.

---

## Riscos e resíduos (conhecidos)

- WAL exige gravacao no diretorio do banco. Se o diretorio for somente leitura em produção, `journal_mode = WAL` falha silenciosamente e o banco segue no journal mode padrao — comportamento aceitavel, nao derruba a aplicacao.
- PRAGMAs como `synchronous`, `temp_store` e `busy_timeout` sao de conexao; com pool do Prisma podem nao persistir entre conexoes. Essa e a mesma suposicao do codigo anterior; a correcao nao piora nem melhora esse ponto.
- Em produção (`systemd`, um unico processo) a contencao de arquivo do dev nao ocorre; a correcao continua valida como defesa.
- Retry por consulta (`withRetry` em `src/lib/api/retry.ts`) existe no projeto e pode ser adicionado posteriormente apenas em caminhos de gravacao de alto conflito, se evidenciado. Nao esta no escopo desta correcao.
---

## Escopo fora deste relatório

Não se altera schema, migrações, seed, variáveis de ambiente, nem regras de negócio de pendências (calculadas on the fly em `src/lib/pendencias-dinamicas.ts`).
