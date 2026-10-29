import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

const QUANTIDADE_PRAGMAS = 5;
const PRIMEIRA_PRAGMA = 0;

function importarModulo() {
  process.env.DATABASE_URL = "file:./prisma/dev.db";
  return import("./prisma");
}

describe("garantirDiretorioSqlite", () => {
  it("retorna undefined para qualquer URL (no-op seguro no Edge)", async () => {
    const modulo = await importarModulo();
    expect(modulo.garantirDiretorioSqlite("file:./prisma/dev.db")).toBeUndefined();
    expect(modulo.garantirDiretorioSqlite("postgres://localhost:5432/db")).toBeUndefined();
  });
});

describe("aplicarOtimizacoesSqlite", () => {
  it("nao propaga falha de banco inacessivel (error code 14); resolve e tenta todas as PRAGMAs", async () => {
    const modulo = await importarModulo();
    const erro = new Error("Error querying the database: Error code 14: Unable to open the database file");
    const chamadas: string[] = [];
    const prismaFalso = {
      $queryRawUnsafe: vi.fn<(sql: unknown) => Promise<unknown>>(async (sql: unknown) => {
        chamadas.push(String(sql));
        throw erro;
      }),
    } as unknown as PrismaClient;

    await expect(modulo.aplicarOtimizacoesSqlite(prismaFalso)).resolves.toBeUndefined();

    expect(chamadas[PRIMEIRA_PRAGMA]).toContain("busy_timeout"); // bloqueio primeiro
    expect(chamadas).toHaveLength(QUANTIDADE_PRAGMAS); // nenhuma PRAGMA interrompe as demais
    expect(prismaFalso.$queryRawUnsafe).toHaveBeenCalledTimes(QUANTIDADE_PRAGMAS);
  });
});

describe("ensureSqliteOptimizations", () => {
  it("resolva com banco real sem lancar (regressao do comportamento anterior)", async () => {
    const modulo = await importarModulo();
    modulo.resetarEstadoSqliteParaTestes();
    await expect(modulo.ensureSqliteOptimizations()).resolves.toBeUndefined();
  });

  it("e single-flight: chamadas concorrentes retornam a mesma promise", async () => {
    const modulo = await importarModulo();
    modulo.resetarEstadoSqliteParaTestes();
    const primeira = modulo.ensureSqliteOptimizations();
    const segunda = modulo.ensureSqliteOptimizations();

    expect(segunda).toBe(primeira);
    await expect(primeira).resolves.toBeUndefined();
  });
});
