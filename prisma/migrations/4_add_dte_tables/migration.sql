-- CreateEnum
CREATE TYPE "DteEstado" AS ENUM ('BORRADOR', 'FIRMADO', 'ENVIADO', 'ACEPTADO', 'RECHAZADO', 'ANULADO');

-- CreateEnum
CREATE TYPE "DteSentido" AS ENUM ('SALIDA', 'ENTRADA');

-- AlterTable: emisor SII profile on Tenant
ALTER TABLE "Tenant" ADD COLUMN "razonSocial" TEXT,
ADD COLUMN "giro" TEXT,
ADD COLUMN "actividadEconomica" TEXT,
ADD COLUMN "direccion" TEXT,
ADD COLUMN "comuna" TEXT,
ADD COLUMN "emailSii" TEXT;

-- CreateTable
CREATE TABLE "Caf" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tipoDte" INTEGER NOT NULL,
    "folioDesde" INTEGER NOT NULL,
    "folioHasta" INTEGER NOT NULL,
    "nextFolio" INTEGER NOT NULL,
    "xml" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Caf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DteDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sentido" "DteSentido" NOT NULL DEFAULT 'SALIDA',
    "tipoDte" INTEGER NOT NULL,
    "folio" INTEGER,
    "fechaEmision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receptorRut" TEXT NOT NULL,
    "receptorRazonSocial" TEXT NOT NULL,
    "receptorGiro" TEXT,
    "receptorDireccion" TEXT,
    "receptorComuna" TEXT,
    "receptorEmail" TEXT,
    "tipoTraslado" INTEGER,
    "motivoTraslado" TEXT,
    "neto" INTEGER NOT NULL DEFAULT 0,
    "mntExe" INTEGER NOT NULL DEFAULT 0,
    "iva" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "estado" "DteEstado" NOT NULL DEFAULT 'BORRADOR',
    "trackId" TEXT,
    "siiResponse" TEXT,
    "xml" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DteDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DteItem" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "linea" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "cantidad" DECIMAL(14,3) NOT NULL DEFAULT 1,
    "precioUnitario" INTEGER NOT NULL,
    "descuento" INTEGER NOT NULL DEFAULT 0,
    "afectoIva" BOOLEAN NOT NULL DEFAULT true,
    "total" INTEGER NOT NULL,

    CONSTRAINT "DteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DteReference" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "tipoDteRef" INTEGER NOT NULL,
    "folioRef" INTEGER NOT NULL,
    "fechaRef" TIMESTAMP(3),
    "codigoRef" INTEGER,
    "motivo" TEXT,

    CONSTRAINT "DteReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Caf_tenantId_tipoDte_idx" ON "Caf"("tenantId", "tipoDte");

-- CreateIndex
CREATE INDEX "DteDocument_tenantId_tipoDte_fechaEmision_idx" ON "DteDocument"("tenantId", "tipoDte", "fechaEmision");

-- CreateIndex
CREATE INDEX "DteDocument_tenantId_estado_idx" ON "DteDocument"("tenantId", "estado");

-- CreateIndex
CREATE INDEX "DteItem_documentId_idx" ON "DteItem"("documentId");

-- CreateIndex
CREATE INDEX "DteReference_documentId_idx" ON "DteReference"("documentId");

-- AddForeignKey
ALTER TABLE "Caf" ADD CONSTRAINT "Caf_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DteDocument" ADD CONSTRAINT "DteDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DteItem" ADD CONSTRAINT "DteItem_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DteDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DteReference" ADD CONSTRAINT "DteReference_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DteDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
