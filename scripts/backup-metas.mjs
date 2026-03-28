#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

function carregarDatabaseUrl() {
  const envPath = path.join(process.cwd(), ".env");
  const conteudo = fs.readFileSync(envPath, "utf8");
  const match = conteudo.match(/^DATABASE_URL\s*=\s*"?([^"]+)"?$/m);

  if (!match) {
    throw new Error("DATABASE_URL nao encontrada no arquivo .env.");
  }

  return match[1].trim();
}

function resolverCaminhoBanco(databaseUrl) {
  if (!databaseUrl.startsWith("file:")) {
    throw new Error("O script de backup atual suporta apenas SQLite com DATABASE_URL iniciando em file:.");
  }

  const caminhoRelativo = databaseUrl.slice("file:".length);
  return path.resolve(process.cwd(), caminhoRelativo);
}

function timestampArquivo(data = new Date()) {
  const pad = (valor) => String(valor).padStart(2, "0");
  return [
    data.getFullYear(),
    pad(data.getMonth() + 1),
    pad(data.getDate()),
    "-",
    pad(data.getHours()),
    pad(data.getMinutes()),
    pad(data.getSeconds()),
  ].join("");
}

async function main() {
  const databaseUrl = carregarDatabaseUrl();
  const caminhoBanco = resolverCaminhoBanco(databaseUrl);

  if (!fs.existsSync(caminhoBanco)) {
    throw new Error(`Banco SQLite nao encontrado em ${caminhoBanco}.`);
  }

  const prisma = new PrismaClient();
  const pastaBackup = path.join(process.cwd(), "backups", "metas");
  fs.mkdirSync(pastaBackup, { recursive: true });

  const timestamp = timestampArquivo();
  const arquivoBanco = path.join(pastaBackup, `${timestamp}-metas.sqlite`);
  const arquivoJson = path.join(pastaBackup, `${timestamp}-metas.json`);

  fs.copyFileSync(caminhoBanco, arquivoBanco);

  const [metas, templates, periodos, progressos] = await Promise.all([
    prisma.meta.findMany({ orderBy: { criado_em: "asc" } }),
    prisma.metaTemplate.findMany({ orderBy: { criado_em: "asc" } }),
    prisma.metaPeriodo.findMany({ orderBy: { criado_em: "asc" } }),
    prisma.metaProgresso.findMany({ orderBy: { atualizado_em: "asc" } }),
  ]);

  const payload = {
    criado_em: new Date().toISOString(),
    origem: {
      database_url: databaseUrl,
      banco_copiado_de: caminhoBanco,
    },
    resumo: {
      metas: metas.length,
      templates: templates.length,
      periodos: periodos.length,
      progressos: progressos.length,
    },
    dados: {
      metas,
      templates,
      periodos,
      progressos,
    },
  };

  fs.writeFileSync(arquivoJson, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  await prisma.$disconnect();

  console.log("Backup concluido com sucesso.");
  console.log(`- Banco completo: ${arquivoBanco}`);
  console.log(`- Exportacao JSON: ${arquivoJson}`);
  console.log(
    `- Registros: metas=${metas.length}, templates=${templates.length}, periodos=${periodos.length}, progressos=${progressos.length}`,
  );
}

main().catch(async (erro) => {
  console.error(`Erro ao gerar backup de metas: ${erro.message}`);
  process.exit(1);
});
