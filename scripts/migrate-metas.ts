/**
 * Script de migração de metas legadas para o novo modelo unificado (MetaNova).
 *
 * Uso: npx tsx scripts/migrate-metas.ts [--dry-run]
 *
 * Flags:
 *   --dry-run  Apenas valida e exibe divergências, sem executar a migração.
 *
 * Fluxo:
 * 1. Valida pré-migração: checa integridade dos dados legados
 * 2. Executa migração SQL via Prisma raw
 * 3. Loga divergências e resultados
 */

import { PrismaClient } from "@prisma/client";
import { execSync } from "node:child_process";
import path from "node:path";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  console.log("=== Migração de Metas Legadas ===\n");
  if (DRY_RUN) console.log("[DRY-RUN] Modo de validação apenas.\n");

  // 1. Validação pré-migração
  console.log("1. Validando dados legados...\n");

  const totalMetas = await prisma.$queryRaw<Array<{ total: bigint }>>`
    SELECT COUNT(*) as total FROM Meta WHERE ativo = 1 AND tipo = 'PDV'
  `;
  const total = Number(totalMetas[0]?.total ?? 0);
  console.log(`   Metas ativas PDV: ${total}`);

  const semPdv = await prisma.$queryRaw<Array<{ total: bigint }>>`
    SELECT COUNT(*) as total FROM Meta WHERE ativo = 1 AND tipo = 'PDV' AND id_pdv IS NULL
  `;
  const semPdvCount = Number(semPdv[0]?.total ?? 0);
  if (semPdvCount > 0) {
    console.warn(`   ⚠ ${semPdvCount} metas sem PDV vinculado (serão ignoradas)`);
  }

  // Verifica divergências: metas com periodo = 'SEMANAL' mas sem MetaPeriodo
  const semPeriodo = await prisma.$queryRaw<Array<{ total: bigint }>>`
    SELECT COUNT(*) as total
    FROM Meta m
    LEFT JOIN MetaPeriodo mp ON mp.id_meta_legada = m.id
    WHERE m.ativo = 1 AND m.tipo = 'PDV' AND m.periodo = 'SEMANAL' AND mp.id IS NULL
  `;
  const semPeriodoCount = Number(semPeriodo[0]?.total ?? 0);
  if (semPeriodoCount > 0) {
    console.warn(`   ⚠ ${semPeriodoCount} metas SEMANAIS sem MetaPeriodo (semana_do_mes = 1 assumido)`);
  }

  // Verifica duplicatas no destino
  const duplicatas = await prisma.$queryRaw<Array<{ total: bigint }>>`
    SELECT COUNT(*) as total FROM MetaNova WHERE ativo = 1
  `;
  const existentes = Number(duplicatas[0]?.total ?? 0);
  console.log(`   Metas já existentes na nova tabela: ${existentes}`);

  // 2. Contagem de templates com origem_resultado
  const templatesComOrigem = await prisma.$queryRaw<Array<{ total: bigint }>>`
    SELECT COUNT(*) as total FROM MetaTemplate WHERE origem_resultado IS NOT NULL AND origem_resultado != ''
  `;
  console.log(`   Templates com origem_resultado: ${Number(templatesComOrigem[0]?.total ?? 0)}`);

  if (total === 0) {
    console.log("\n   Nenhuma meta legada ativa para migrar.");
    await prisma.$disconnect();
    return;
  }

  // 3. Executa migração SQL
  console.log("\n2. Executando migração SQL...\n");

  if (DRY_RUN) {
    console.log("   [DRY-RUN] SQL seria executado. Nenhuma alteração feita.\n");
  } else {
    const sqlPath = path.resolve(__dirname, "../prisma/migrations/migrate_metas_legadas.sql");
    const sql = execSync(`cat "${sqlPath}"`, { encoding: "utf-8" });
    // Divide em statements e executa um por um
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("--") && !s.startsWith("PRAGMA"));

    for (const stmt of statements) {
      try {
        await prisma.$executeRawUnsafe(stmt);
      } catch (err: any) {
        // Ignora erros de duplicata (UNIQUE constraint)
        if (err?.message?.includes("UNIQUE constraint")) {
          console.log("   (duplicata ignorada)");
        } else {
          console.error(`   Erro: ${err?.message ?? err}`);
        }
      }
    }
    console.log("   SQL executado.\n");
  }

  // 4. Log de resultados
  console.log("3. Resultados:\n");

  const migradas = await prisma.$queryRaw<Array<{ total: bigint }>>`
    SELECT COUNT(*) as total FROM MetaNova WHERE id LIKE 'mig_%'
  `;
  console.log(`   Metas migradas: ${Number(migradas[0]?.total ?? 0)}`);

  const ativas = await prisma.$queryRaw<Array<{ total: bigint }>>`
    SELECT COUNT(*) as total FROM MetaNova WHERE ativo = 1
  `;
  console.log(`   Metas ativas na nova tabela: ${Number(ativas[0]?.total ?? 0)}`);

  // Divergências pós-migração
  const metaCount = await prisma.$queryRaw<Array<{ total: bigint }>>`
    SELECT COUNT(*) as total FROM Meta WHERE ativo = 1 AND tipo = 'PDV'
  `;
  const metaAtivas = Number(metaCount[0]?.total ?? 0);
  const novaAtivas = Number(ativas[0]?.total ?? 0);

  if (metaAtivas > novaAtivas) {
    console.warn(`\n   ⚠ Divergência: ${metaAtivas - novaAtivas} metas legadas não foram migradas.`);
    console.warn("   Verifique se são metas com tipo diferente de PDV ou sem id_pdv.");
  } else {
    console.log("\n   ✓ Todas as metas legadas foram migradas com sucesso.");
  }

  await prisma.$disconnect();
  console.log("\n=== Migração concluída ===");
}

main().catch((err) => {
  console.error("Erro na migração:", err);
  prisma.$disconnect().catch(() => {});
  process.exit(1);
});
