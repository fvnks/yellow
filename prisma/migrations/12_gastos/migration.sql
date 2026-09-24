-- Gastos del ERP: caja menor / rendiciones reembolsables, fuera del
-- circuito de DTE. Idempotente: seguro de re-aplicar con `migrate deploy`.

CREATE TABLE IF NOT EXISTS "Gasto" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "descripcion" TEXT NOT NULL,
  "monto" INTEGER NOT NULL,
  "categoriaId" TEXT,
  "fecha" TIMESTAMP(3) NOT NULL,
  "fechaReembolso" TIMESTAMP(3),
  "comentario" TEXT,
  "registradoPorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Gasto_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Gasto_tenantId_fecha_idx" ON "Gasto"("tenantId", "fecha");

DO $$
BEGIN
  ALTER TABLE "Gasto"
    ADD CONSTRAINT "Gasto_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Gasto"
    ADD CONSTRAINT "Gasto_categoriaId_fkey"
    FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Gasto"
    ADD CONSTRAINT "Gasto_registradoPorId_fkey"
    FOREIGN KEY ("registradoPorId") REFERENCES "User"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
