-- Módulos activables por tenant (selector del panel).
-- Idempotente: seguro de re-aplicar con `migrate deploy`.

DO $$
BEGIN
  CREATE TYPE "ModuleKey" AS ENUM ('FACTURACION', 'COMPRAS', 'LIBROS', 'REPORTES');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "TenantModule" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "key" "ModuleKey" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantModule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TenantModule_tenantId_idx" ON "TenantModule"("tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "TenantModule_tenantId_key_key" ON "TenantModule"("tenantId", "key");

DO $$
BEGIN
  ALTER TABLE "TenantModule"
    ADD CONSTRAINT "TenantModule_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Backfill: los módulos core quedan activos para todos los tenants existentes.
INSERT INTO "TenantModule" ("id", "tenantId", "key")
SELECT md5(random()::text || clock_timestamp()::text), t."id", m."key"
FROM "Tenant" t
CROSS JOIN (
  VALUES ('FACTURACION'::"ModuleKey"),
         ('COMPRAS'::"ModuleKey"),
         ('LIBROS'::"ModuleKey")
) AS m("key")
WHERE NOT EXISTS (
  SELECT 1 FROM "TenantModule" tm
  WHERE tm."tenantId" = t."id" AND tm."key" = m."key"
);
