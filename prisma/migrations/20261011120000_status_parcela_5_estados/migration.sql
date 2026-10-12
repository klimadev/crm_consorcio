-- Migração: máquina de 5 estados de parcela (Churn Tracking) — SQLite
-- Converte os valores legados ("PENDENTE"/"PAGO") para os novos valores:
--   PAGO -> PAGA
--   PENDENTE com vencimento hoje/futuro -> AGUARDANDO
--   PENDENTE vencida -> ATRASADA
-- Integridade garantida via tabela nova + CHECK constraint (SQLite não suporta
-- alterar tipo/constraint de coluna in-place; reconstruímos a tabela).

PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

-- 1. Nova tabela com as colunas de cancelamento e CHECK dos 5 status
CREATE TABLE "Parcela_nova" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "id_empresa" TEXT NOT NULL,
  "id_lead" TEXT NOT NULL,
  "numero_parcela" INTEGER NOT NULL,
  "quantidade_total" INTEGER NOT NULL,
  "valor" REAL NOT NULL,
  "data_vencimento" DATETIME NOT NULL,
  "data_pagamento" DATETIME,
  "status" TEXT NOT NULL DEFAULT 'AGUARDANDO'
    CONSTRAINT "Parcela_status_check" CHECK ("status" IN ('AGUARDANDO','ATRASADA','PAGA','CANCELADA','ABORTADA')),
  "motivo_cancelamento" TEXT,
  "cancelado_em" DATETIME,
  "cancelado_por" TEXT,
  "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" DATETIME NOT NULL,
  CONSTRAINT "Parcela_id_lead_numero_parcela_key" UNIQUE ("id_lead", "numero_parcela"),
  CONSTRAINT "Parcela_id_empresa_fkey" FOREIGN KEY ("id_empresa") REFERENCES "Empresa" ("id"),
  CONSTRAINT "Parcela_id_lead_fkey" FOREIGN KEY ("id_lead") REFERENCES "Lead" ("id") ON DELETE CASCADE
);

-- 2. Copia com conversão legada
INSERT INTO "Parcela_nova" ("id","id_empresa","id_lead","numero_parcela","quantidade_total","valor",
  "data_vencimento","data_pagamento","status","criado_em","atualizado_em")
SELECT "id","id_empresa","id_lead","numero_parcela","quantidade_total","valor",
  "data_vencimento","data_pagamento",
  CASE
    WHEN "status" = 'PAGO' THEN 'PAGA'
    WHEN "status" = 'PENDENTE' AND date("data_vencimento") < date('now') THEN 'ATRASADA'
    ELSE 'AGUARDANDO'
  END,
  "criado_em","atualizado_em"
FROM "Parcela";

-- 3. Troca as tabelas e recria índices
DROP TABLE "Parcela";
ALTER TABLE "Parcela_nova" RENAME TO "Parcela";
CREATE INDEX "Parcela_id_empresa_idx" ON "Parcela"("id_empresa");
CREATE INDEX "Parcela_id_lead_idx" ON "Parcela"("id_lead");
CREATE INDEX "Parcela_id_empresa_status_idx" ON "Parcela"("id_empresa", "status");
CREATE INDEX "Parcela_id_empresa_data_vencimento_idx" ON "Parcela"("id_empresa", "data_vencimento");
CREATE INDEX "Parcela_id_lead_numero_parcela_idx" ON "Parcela"("id_lead", "numero_parcela");

PRAGMA foreign_key_check;
COMMIT;
PRAGMA foreign_keys=ON;
