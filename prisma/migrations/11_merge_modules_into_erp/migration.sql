-- Consolida los módulos legacy FACTURACION y COMPRAS en el nuevo módulo ERP.
-- Idempotente: seguro de re-aplicar con `migrate deploy`.

INSERT INTO "TenantModule" ("id", "tenantId", "key")
SELECT md5(random()::text || clock_timestamp()::text), t."tenantId", 'ERP'::"ModuleKey"
FROM (
  SELECT DISTINCT "tenantId" FROM "TenantModule" WHERE "key" IN ('FACTURACION', 'COMPRAS')
) t
WHERE NOT EXISTS (
  SELECT 1 FROM "TenantModule" tm
  WHERE tm."tenantId" = t."tenantId" AND tm."key" = 'ERP'::"ModuleKey"
);

DELETE FROM "TenantModule" WHERE "key" IN ('FACTURACION', 'COMPRAS');
