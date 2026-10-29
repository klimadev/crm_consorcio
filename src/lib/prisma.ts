import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const isEdgeRuntime = process.env.NEXT_RUNTIME === "edge";

function isSqlite() {
  return (process.env.DATABASE_URL ?? "").includes("file:");
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
    transactionOptions: {
      timeout: 30000,
    },
  });

let sqliteOptimizationsPromise: Promise<void> | undefined;

/**
 * Garante que o diretorio do arquivo SQLite exista antes de qualquer abertura.
 * No-op neste modulo: o diretorio `prisma/` ja existe no repositorio e o
 * Erro 14 (SQLITE_CANTOPEN) eh contecao de arquivo no Windows, nao falta de
 * diretorio. Mantido como ponto de expansao segura para o Edge Runtime.
 */
export function garantirDiretorioSqlite(_url: string): undefined {
  return undefined;
}

/**
 * Aplica uma PRAGMA de otimizacao sem derrubar a aplicacao.
 * Falha e engolida silenciosamente: consultas comuns continuam funcionando.
 */
async function aplicarPragma(prismaClient: PrismaClient, sql: string): Promise<void> {
  try {
    await prismaClient.$queryRawUnsafe(sql);
  } catch {
    // otimizacao nao critica: falha silenciosa
  }
}

/**
 * Aplica as PRAGMAs de otimizacao SQLite.
 * busy_timeout vai primeiro para reduzir contecao; demais PRAGMAs sao tentadas
 * individualmente e uma falha nao impede as outras. Nunca lancar.
 */
export async function aplicarOtimizacoesSqlite(
  prismaClient: PrismaClient = prisma
): Promise<void> {
  if (!isSqlite() || isEdgeRuntime) {
    return;
  }

  const pragmas = [
    "PRAGMA busy_timeout = 15000",
    "PRAGMA journal_mode = WAL",
    "PRAGMA synchronous = NORMAL",
    "PRAGMA temp_store = MEMORY",
    "PRAGMA foreign_keys = ON",
  ];

  await Promise.all(pragmas.map((sql) => aplicarPragma(prismaClient, sql)));
}

/**
 * Single-flight da inicializacao SQLite.
 * Sempre resolve (mesmo em falha): nao envenena importacoes subsequentes.
 */
export function ensureSqliteOptimizations(): Promise<void> {
  if (!isSqlite() || isEdgeRuntime) {
    return Promise.resolve();
  }

  if (!sqliteOptimizationsPromise) {
    sqliteOptimizationsPromise = aplicarOtimizacoesSqlite().then(
      () => undefined,
      () => undefined
    );
  }

  return sqliteOptimizationsPromise;
}

/**
 * Reseta o single-flight apenas para testes de unidade.
 */
export function resetarEstadoSqliteParaTestes(): void {
  sqliteOptimizationsPromise = undefined;
}

/**
 * Inicializacao de nivel de modulo nunca derruba a aplicacao,
 * mesmo com banco bloqueado (SQLITE_CANTOPEN / codigo 14).
 */
if (!isEdgeRuntime) {
  try {
    void ensureSqliteOptimizations();
  } catch {
    // nao lancar no carregamento do modulo
  }
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
