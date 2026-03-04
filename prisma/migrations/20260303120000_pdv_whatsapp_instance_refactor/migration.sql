-- Refactor: mover associacao de instancia WhatsApp de Lead para PDV
PRAGMA foreign_keys=OFF;

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

-- 2) Backfill da instancia padrao por PDV antes de remover coluna legada de Lead
WITH instancia_por_pdv AS (
  SELECT
    f."id_pdv" AS id_pdv,
    l."id_whatsapp_instancia" AS id_whatsapp_instancia,
    COUNT(*) AS frequencia,
    MAX(l."atualizado_em") AS atualizado_mais_recente
  FROM "Lead" l
  INNER JOIN "Funcionario" f ON f."id" = l."id_funcionario"
  WHERE l."id_whatsapp_instancia" IS NOT NULL
  GROUP BY f."id_pdv", l."id_whatsapp_instancia"
),
instancia_escolhida AS (
  SELECT id_pdv, id_whatsapp_instancia
  FROM (
    SELECT
      ip.*,
      ROW_NUMBER() OVER (
        PARTITION BY ip.id_pdv
        ORDER BY ip.frequencia DESC, ip.atualizado_mais_recente DESC, ip.id_whatsapp_instancia ASC
      ) AS ranking
    FROM instancia_por_pdv ip
  )
  WHERE ranking = 1
)
UPDATE "Pdv"
SET "id_whatsapp_instancia" = (
  SELECT ie.id_whatsapp_instancia
  FROM instancia_escolhida ie
  WHERE ie.id_pdv = "Pdv"."id"
)
WHERE "id" IN (SELECT id_pdv FROM instancia_escolhida);

-- 3) Redefine Lead removendo id_whatsapp_instancia e relacao legada
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

-- 4) Recria indices impactados
CREATE INDEX "Pdv_id_empresa_idx" ON "Pdv"("id_empresa");
CREATE INDEX "Pdv_id_empresa_id_whatsapp_instancia_idx" ON "Pdv"("id_empresa", "id_whatsapp_instancia");
CREATE INDEX "Lead_id_empresa_idx" ON "Lead"("id_empresa");
CREATE INDEX "Lead_id_funcionario_idx" ON "Lead"("id_funcionario");
CREATE INDEX "Lead_id_estagio_idx" ON "Lead"("id_estagio");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
