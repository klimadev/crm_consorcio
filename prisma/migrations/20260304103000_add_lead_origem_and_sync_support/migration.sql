ALTER TABLE "Lead" ADD COLUMN "origem" TEXT NOT NULL DEFAULT 'MANUAL';

UPDATE "Lead"
SET "origem" = 'MANUAL'
WHERE "origem" IS NULL OR TRIM("origem") = '';
