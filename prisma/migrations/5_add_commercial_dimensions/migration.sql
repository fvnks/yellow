-- AlterTable: receptor columns become nullable so third-party (ENTRADA)
-- documents store the provider in the emisor columns instead.
ALTER TABLE "DteDocument" ALTER COLUMN "receptorRut" DROP NOT NULL;
ALTER TABLE "DteDocument" ALTER COLUMN "receptorRazonSocial" DROP NOT NULL;

-- AlterTable: provider (ENTRADA) + commercial dimensions on DteDocument
ALTER TABLE "DteDocument" ADD COLUMN "emisorRut" TEXT,
ADD COLUMN "emisorRazonSocial" TEXT,
ADD COLUMN "emisorGiro" TEXT,
ADD COLUMN "vendedorId" TEXT,
ADD COLUMN "costCenterId" TEXT;

-- AlterTable: category on line items
ALTER TABLE "DteItem" ADD COLUMN "categoryId" TEXT;

-- CreateTable
CREATE TABLE "Vendedor" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CentroCosto" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CentroCosto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Vendedor_tenantId_activo_idx" ON "Vendedor"("tenantId", "activo");

-- CreateIndex
CREATE INDEX "CentroCosto_tenantId_activo_idx" ON "CentroCosto"("tenantId", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "CentroCosto_tenantId_codigo_key" ON "CentroCosto"("tenantId", "codigo");

-- CreateIndex
CREATE INDEX "Categoria_tenantId_activo_idx" ON "Categoria"("tenantId", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_tenantId_nombre_key" ON "Categoria"("tenantId", "nombre");

-- CreateIndex
CREATE INDEX "DteDocument_tenantId_sentido_fechaEmision_idx" ON "DteDocument"("tenantId", "sentido", "fechaEmision");

-- CreateIndex
CREATE INDEX "DteDocument_tenantId_vendedorId_idx" ON "DteDocument"("tenantId", "vendedorId");

-- CreateIndex
CREATE INDEX "DteDocument_tenantId_costCenterId_idx" ON "DteDocument"("tenantId", "costCenterId");

-- CreateIndex
CREATE INDEX "DteItem_categoryId_idx" ON "DteItem"("categoryId");

-- AddForeignKey
ALTER TABLE "Vendedor" ADD CONSTRAINT "Vendedor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CentroCosto" ADD CONSTRAINT "CentroCosto_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Categoria" ADD CONSTRAINT "Categoria_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DteDocument" ADD CONSTRAINT "DteDocument_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "Vendedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DteDocument" ADD CONSTRAINT "DteDocument_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CentroCosto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DteItem" ADD CONSTRAINT "DteItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;
