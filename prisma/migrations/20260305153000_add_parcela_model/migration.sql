CREATE TABLE "Parcela" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "id_empresa" TEXT NOT NULL,
  "id_lead" TEXT NOT NULL,
  "numero_parcela" INTEGER NOT NULL,
  "quantidade_total" INTEGER NOT NULL,
  "valor" REAL NOT NULL,
  "data_vencimento" DATETIME NOT NULL,
  "data_pagamento" DATETIME,
  "status" TEXT NOT NULL DEFAULT 'PENDENTE',
  "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Parcela_id_lead_fkey" FOREIGN KEY ("id_lead") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Parcela_id_empresa_fkey" FOREIGN KEY ("id_empresa") REFERENCES "Empresa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Parcela_id_lead_numero_parcela_key" ON "Parcela"("id_lead", "numero_parcela");
CREATE INDEX "Parcela_id_empresa_idx" ON "Parcela"("id_empresa");
CREATE INDEX "Parcela_id_lead_idx" ON "Parcela"("id_lead");
CREATE INDEX "Parcela_id_empresa_status_idx" ON "Parcela"("id_empresa", "status");
CREATE INDEX "Parcela_id_empresa_data_vencimento_idx" ON "Parcela"("id_empresa", "data_vencimento");
