-- Correcao de drift: coluna premium_liberado existia no schema.prisma (commit
-- anterior ao epic) mas nunca foi criada no banco. O erro P2022
-- "Empresa.premium_liberado does not exist" ocorreu apos o prisma generate do
-- epic regerar o client incluindo a coluna no SELECT de toda query de Empresa.
-- SQLite aceita ADD COLUMN com DEFAULT sem reconstruir a tabela.

ALTER TABLE "Empresa" ADD COLUMN "premium_liberado" BOOLEAN NOT NULL DEFAULT 1;
