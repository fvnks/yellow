-- Cotizaciones: propuesta comercial con ítems, vigencia y conversión a
-- factura de venta (BORRADOR del DTE). Idempotente para `migrate deploy`.

DO $$
BEGIN
  CREATE TYPE "CotizacionEstado" AS ENUM ('BORRADOR', 'ENVIADA', 'ACEPTADA', 'RECHAZADA', 'CONVERTIDA');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Cotizacion" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "numero" INTEGER NOT NULL,
  "receptorRut" TEXT NOT NULL,
  "receptorRazonSocial" TEXT NOT NULL,
  "receptorGiro" TEXT,
  "receptorComuna" TEXT,
  "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validaHasta" TIMESTAMP(3),
  "comentario" TEXT,
  "estado" "CotizacionEstado" NOT NULL DEFAULT 'BORRADOR',
  "dteId" TEXT,
  "vendedorId" TEXT,
  "costCenterId" TEXT,
  "neto" INTEGER NOT NULL,
  "iva" INTEGER NOT NULL,
  "total" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Cotizacion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CotizacionItem" (
  "id" TEXT NOT NULL,
  "cotizacionId" TEXT NOT NULL,
  "linea" INTEGER NOT NULL,
  "nombre" TEXT NOT NULL,
  "cantidad" DECIMAL(14,3) NOT NULL DEFAULT 1,
  "precioUnitario" INTEGER NOT NULL,
  "descuento" INTEGER NOT NULL DEFAULT 0,
  "total" INTEGER NOT NULL,
  "categoryId" TEXT,
  CONSTRAINT "CotizacionItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Cotizacion_tenantId_estado_idx" ON "Cotizacion"("tenantId", "estado");
CREATE UNIQUE INDEX IF NOT EXISTS "Cotizacion_tenantId_numero_key" ON "Cotizacion"("tenantId", "numero");
CREATE INDEX IF NOT EXISTS "CotizacionItem_cotizacionId_idx" ON "CotizacionItem"("cotizacionId");

DO $$
BEGIN
  ALTER TABLE "Cotizacion"
    ADD CONSTRAINT "Cotizacion_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "CotizacionItem"
    ADD CONSTRAINT "CotizacionItem_cotizacionId_fkey"
    FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
