-- Refactor: mover associacao de instancia WhatsApp de Lead para PDV
PRAGMA foreign_keys=OFF;

CREATE TABLE IF NOT EXISTS "Pdv" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "id_empresa" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Lead" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "id_empresa" TEXT NOT NULL,
  "id_funcionario" TEXT NOT NULL,
  "id_estagio" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "telefone" TEXT NOT NULL,
  "valor_consorcio" REAL NOT NULL,
  "observacoes" TEXT,
  "motivo_perda" TEXT,
  "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "documento_aprovacao_url" TEXT
);

-- 1) Redefine Pdv para incluir id_whatsapp_instancia e FK opcional
CREATE TABLE "new_Pdv" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "id_empresa" TEXT NOT NULL,
  "id_whatsapp_instancia" TEXT,
  "nome" TEXT NOT NULL,
  "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Pdv_id_empresa_fkey" FOREIGN KEY ("id_empresa") REFERENCES "Empresa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Pdv_id_whatsapp_instancia_fkey" FOREIGN KEY ("id_whatsapp_instancia") REFERENCES "WhatsappInstancia" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Pdv" ("id", "id_empresa", "id_whatsapp_instancia", "nome", "criado_em", "atualizado_em")
SELECT "id", "id_empresa", NULL, "nome", "criado_em", "atualizado_em"
FROM "Pdv";

DROP TABLE "Pdv";
ALTER TABLE "new_Pdv" RENAME TO "Pdv";

-- 2) Redefine Lead removendo id_whatsapp_instancia e relacao legada
CREATE TABLE "new_Lead" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "id_empresa" TEXT NOT NULL,
  "id_funcionario" TEXT NOT NULL,
  "id_estagio" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "telefone" TEXT NOT NULL,
  "valor_consorcio" REAL NOT NULL,
  "observacoes" TEXT,
  "motivo_perda" TEXT,
  "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "documento_aprovacao_url" TEXT,
  CONSTRAINT "Lead_id_estagio_fkey" FOREIGN KEY ("id_estagio") REFERENCES "EstagioFunil" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Lead_id_funcionario_fkey" FOREIGN KEY ("id_funcionario") REFERENCES "Funcionario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Lead_id_empresa_fkey" FOREIGN KEY ("id_empresa") REFERENCES "Empresa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Lead" (
  "id", "id_empresa", "id_funcionario", "id_estagio", "nome", "telefone", "valor_consorcio", "observacoes", "motivo_perda", "criado_em", "atualizado_em", "documento_aprovacao_url"
)
SELECT
  "id", "id_empresa", "id_funcionario", "id_estagio", "nome", "telefone", "valor_consorcio", "observacoes", "motivo_perda", "criado_em", "atualizado_em", "documento_aprovacao_url"
FROM "Lead";

DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";

-- 3) Recria indices impactados
CREATE INDEX "Pdv_id_empresa_idx" ON "Pdv"("id_empresa");
CREATE INDEX "Pdv_id_empresa_id_whatsapp_instancia_idx" ON "Pdv"("id_empresa", "id_whatsapp_instancia");
CREATE INDEX "Lead_id_empresa_idx" ON "Lead"("id_empresa");
CREATE INDEX "Lead_id_funcionario_idx" ON "Lead"("id_funcionario");
CREATE INDEX "Lead_id_estagio_idx" ON "Lead"("id_estagio");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
