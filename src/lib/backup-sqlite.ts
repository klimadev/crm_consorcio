import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const TABELAS_IGNORADAS = new Set(["_prisma_migrations", "sqlite_sequence"]);

function resolverCaminhoBanco(): string {
  const url = process.env.DATABASE_URL ?? "";
  if (!url.startsWith("file:")) {
    throw new Error("Backup SQLite indisponível: o banco configurado não é um arquivo SQLite.");
  }

  const caminhoBruto = url.slice("file:".length).split("?")[0];
  if (path.isAbsolute(caminhoBruto)) {
    return caminhoBruto;
  }

  // Prisma resolve caminhos relativos a partir da pasta do schema (prisma/)
  return path.join(process.cwd(), "prisma", caminhoBruto);
}

async function removerDadosDeOutrosTenants(caminhoCopia: string, idEmpresa: string) {
  const banco = new DatabaseSync(caminhoCopia);

  try {
    banco.exec("PRAGMA foreign_keys = OFF");

    const tabelas = banco
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
      )
      .all() as { name: string }[];

    banco.exec("BEGIN IMMEDIATE");

    for (const { name } of tabelas) {
      if (TABELAS_IGNORADAS.has(name)) continue;

      if (name === "Empresa") {
        banco.prepare('DELETE FROM "Empresa" WHERE id <> ?').run(idEmpresa);
        continue;
      }

      const colunas = banco.prepare(`PRAGMA table_info("${name}")`).all() as {
        name: string;
      }[];
      const possuiIdEmpresa = colunas.some((coluna) => coluna.name === "id_empresa");
      if (!possuiIdEmpresa) continue;

      banco.prepare(`DELETE FROM "${name}" WHERE id_empresa <> ?`).run(idEmpresa);
    }

    // TransferenciaLead não possui id_empresa: mantém apenas transferências de leads do tenant
    const possuiTransferencias = tabelas.some((tabela) => tabela.name === "TransferenciaLead");
    if (possuiTransferencias) {
      banco
        .prepare(
          'DELETE FROM "TransferenciaLead" WHERE id_lead NOT IN (SELECT id FROM "Lead")',
        )
        .run();
    }

    banco.exec("COMMIT");
    banco.exec("PRAGMA foreign_keys = ON");

    const violacoes = banco.prepare("PRAGMA foreign_key_check").all();
    if (violacoes.length > 0) {
      throw new Error("Backup gerado com inconsistências de integridade referencial.");
    }

    banco.exec("VACUUM");
  } finally {
    banco.close();
  }
}

/**
 * Gera um snapshot SQLite isolado contendo apenas os dados da empresa informada.
 * Usa VACUUM INTO para criar cópia consistente (à prova de locks/WAL) e depois
 * remove os dados dos demais tenants na cópia, sem tocar no banco original.
 */
export async function gerarArquivoBackupDoTenant(idEmpresa: string): Promise<string> {
  const caminhoOrigem = resolverCaminhoBanco();
  const pastaTemporaria = path.join(tmpdir(), "backup-crm");
  await mkdir(pastaTemporaria, { recursive: true });

  const caminhoDestino = path.join(
    pastaTemporaria,
    `backup-crm-${idEmpresa}-${Date.now()}.sqlite`,
  );

  // Cópia consistente via conexão read-only: imune a locks/WAL, não toca no original
  const origem = new DatabaseSync(caminhoOrigem, { readOnly: true });
  try {
    origem.exec(`VACUUM INTO '${caminhoDestino.replaceAll("'", "''")}'`);
  } finally {
    origem.close();
  }

  try {
    await removerDadosDeOutrosTenants(caminhoDestino, idEmpresa);
  } catch (erro) {
    const { rm } = await import("node:fs/promises");
    await rm(caminhoDestino, { force: true }).catch(() => undefined);
    throw erro;
  }

  return caminhoDestino;
}
