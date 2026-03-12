import { Prisma, PrismaClient } from "@prisma/client";

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

let sqliteOptimizationsPromise: Promise<void> | null = null;

export function ensureSqliteOptimizations() {
  if (!isSqlite() || isEdgeRuntime) {
    return Promise.resolve();
  }

  if (!sqliteOptimizationsPromise) {
    sqliteOptimizationsPromise = (async () => {
      await prisma.$queryRaw(Prisma.sql`PRAGMA journal_mode = WAL`);
      await prisma.$queryRaw(Prisma.sql`PRAGMA synchronous = NORMAL`);
      await prisma.$queryRaw(Prisma.sql`PRAGMA busy_timeout = 15000`);
      await prisma.$queryRaw(Prisma.sql`PRAGMA temp_store = MEMORY`);
      await prisma.$queryRaw(Prisma.sql`PRAGMA foreign_keys = ON`);
    })()
      .then(() => undefined)
      .catch((erro) => {
        sqliteOptimizationsPromise = null;
        console.error("Erro ao aplicar otimizações SQLite:", erro);
        throw erro;
      });
  }

  return sqliteOptimizationsPromise;
}

if (!isEdgeRuntime) {
  ensureSqliteOptimizations().catch((erro) => {
    console.error("Erro ao inicializar otimizações SQLite:", erro);
  });
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
