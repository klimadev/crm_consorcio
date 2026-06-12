-- Overhaul do sistema de metas: unifica Meta + MetaTemplate + MetaPeriodo + MetaProgresso
-- em uma única tabela `Meta` com campos diretos.
-- Tabelas antigas são preservadas (dados legados) mas não usadas pelo novo código.

PRAGMA foreign_keys=OFF;

-- ============================================================
-- Nova tabela Meta (substitui MetaTemplate + MetaPeriodo + MetaProgresso)
-- ============================================================
CREATE TABLE "MetaNova" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "id_empresa" TEXT NOT NULL,
  "titulo" TEXT NOT NULL DEFAULT '',
  "tipo_meta" TEXT NOT NULL,              -- "VALOR" | "VOLUME"
  "origem" TEXT NOT NULL DEFAULT 'PAGAMENTOS', -- "PAGAMENTOS" | "FECHADOS"
  "alvo" REAL NOT NULL,
  "semana" INTEGER NOT NULL,              -- 1-4 (semana do mês)
  "mes_referencia" TEXT NOT NULL,          -- "YYYY-MM"
  "data_inicio" DATETIME NOT NULL,
  "data_fim" DATETIME NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "id_equipe" TEXT NOT NULL,              -- FK para Pdv (antes id_pdv)
  "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" DATETIME NOT NULL,
  CONSTRAINT "MetaNova_id_empresa_fkey" FOREIGN KEY ("id_empresa") REFERENCES "Empresa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MetaNova_id_equipe_fkey" FOREIGN KEY ("id_equipe") REFERENCES "Pdv" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "MetaNova_id_empresa_idx" ON "MetaNova"("id_empresa");
CREATE INDEX "MetaNova_id_equipe_idx" ON "MetaNova"("id_equipe");
CREATE INDEX "MetaNova_id_empresa_ativo_idx" ON "MetaNova"("id_empresa", "ativo");
CREATE INDEX "MetaNova_equipe_mes_semana_idx" ON "MetaNova"("id_equipe", "mes_referencia", "semana", "ativo");
CREATE INDEX "MetaNova_mes_referencia_idx" ON "MetaNova"("mes_referencia");

PRAGMA foreign_keys=ON;
