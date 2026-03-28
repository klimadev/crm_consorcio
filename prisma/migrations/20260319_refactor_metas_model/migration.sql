-- Refatoracao da modelagem de metas
-- Introduz templates, periodos concretos e progresso por periodo.

PRAGMA foreign_keys=OFF;

ALTER TABLE "Empresa" RENAME TO "Empresa_old";
CREATE TABLE "Empresa" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "nome" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "senha_hash" TEXT NOT NULL,
  "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" DATETIME NOT NULL
);
INSERT INTO "Empresa" ("id", "nome", "email", "senha_hash", "criado_em", "atualizado_em")
SELECT "id", "nome", "email", "senha_hash", "criado_em", "atualizado_em" FROM "Empresa_old";
DROP TABLE "Empresa_old";
CREATE UNIQUE INDEX "Empresa_email_key" ON "Empresa"("email");

CREATE TABLE "MetaTemplate" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "id_empresa" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "tipo_meta" TEXT NOT NULL,
  "origem_resultado" TEXT NOT NULL DEFAULT 'PAGAMENTOS',
  "cadencia" TEXT NOT NULL,
  "recorrencia" TEXT NOT NULL DEFAULT 'PONTUAL',
  "nome" TEXT,
  "descricao" TEXT,
  "estagio_ganho_min_ordem" INTEGER,
  "dividir_mensal_em_semanas" BOOLEAN NOT NULL DEFAULT false,
  "vigencia_inicio" DATETIME NOT NULL,
  "vigencia_fim" DATETIME,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" DATETIME NOT NULL,
  "id_pdv" TEXT,
  "id_funcionario" TEXT,
  CONSTRAINT "MetaTemplate_id_empresa_fkey" FOREIGN KEY ("id_empresa") REFERENCES "Empresa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MetaTemplate_id_pdv_fkey" FOREIGN KEY ("id_pdv") REFERENCES "Pdv" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "MetaTemplate_id_funcionario_fkey" FOREIGN KEY ("id_funcionario") REFERENCES "Funcionario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "MetaPeriodo" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "id_empresa" TEXT NOT NULL,
  "id_template" TEXT,
  "id_meta_legada" TEXT,
  "periodo_tipo" TEXT NOT NULL,
  "periodo_label" TEXT NOT NULL,
  "ano" INTEGER NOT NULL,
  "mes" INTEGER,
  "trimestre" INTEGER,
  "semana_do_mes" INTEGER,
  "alvo" REAL NOT NULL,
  "data_inicio" DATETIME NOT NULL,
  "data_fim" DATETIME NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" DATETIME NOT NULL,
  CONSTRAINT "MetaPeriodo_id_empresa_fkey" FOREIGN KEY ("id_empresa") REFERENCES "Empresa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MetaPeriodo_id_template_fkey" FOREIGN KEY ("id_template") REFERENCES "MetaTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "MetaPeriodo_id_meta_legada_fkey" FOREIGN KEY ("id_meta_legada") REFERENCES "Meta" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "MetaPeriodo_id_meta_legada_key" ON "MetaPeriodo"("id_meta_legada");
CREATE INDEX "MetaTemplate_id_empresa_tipo_ativo_idx" ON "MetaTemplate"("id_empresa", "tipo", "ativo");
CREATE INDEX "MetaTemplate_id_empresa_cadencia_recorrencia_ativo_idx" ON "MetaTemplate"("id_empresa", "cadencia", "recorrencia", "ativo");
CREATE INDEX "MetaTemplate_id_pdv_idx" ON "MetaTemplate"("id_pdv");
CREATE INDEX "MetaTemplate_id_funcionario_idx" ON "MetaTemplate"("id_funcionario");
CREATE INDEX "MetaPeriodo_id_empresa_periodo_tipo_ano_mes_idx" ON "MetaPeriodo"("id_empresa", "periodo_tipo", "ano", "mes");
CREATE INDEX "MetaPeriodo_id_empresa_semana_do_mes_ano_mes_idx" ON "MetaPeriodo"("id_empresa", "semana_do_mes", "ano", "mes");
CREATE INDEX "MetaPeriodo_id_template_idx" ON "MetaPeriodo"("id_template");

ALTER TABLE "Meta" ADD COLUMN "periodo_refId" TEXT;

ALTER TABLE "MetaProgresso" RENAME TO "MetaProgresso_old";
CREATE TABLE "MetaProgresso" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "id_meta" TEXT,
  "id_meta_periodo" TEXT,
  "id_empresa" TEXT NOT NULL,
  "periodo" TEXT NOT NULL,
  "realizado" REAL NOT NULL,
  "atualizado_em" DATETIME NOT NULL,
  CONSTRAINT "MetaProgresso_id_meta_fkey" FOREIGN KEY ("id_meta") REFERENCES "Meta" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MetaProgresso_id_meta_periodo_fkey" FOREIGN KEY ("id_meta_periodo") REFERENCES "MetaPeriodo" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MetaProgresso_id_empresa_fkey" FOREIGN KEY ("id_empresa") REFERENCES "Empresa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "MetaProgresso" ("id", "id_meta", "id_meta_periodo", "id_empresa", "periodo", "realizado", "atualizado_em")
SELECT "id", "id_meta", NULL, "id_empresa", "periodo", "realizado", "atualizado_em" FROM "MetaProgresso_old";
DROP TABLE "MetaProgresso_old";
CREATE INDEX "MetaProgresso_id_empresa_periodo_idx" ON "MetaProgresso"("id_empresa", "periodo");
CREATE INDEX "MetaProgresso_id_meta_periodo_idx" ON "MetaProgresso"("id_meta", "periodo");
CREATE INDEX "MetaProgresso_id_meta_periodo_novo_idx" ON "MetaProgresso"("id_meta_periodo", "periodo");

CREATE INDEX "Meta_periodo_refId_idx" ON "Meta"("periodo_refId");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
