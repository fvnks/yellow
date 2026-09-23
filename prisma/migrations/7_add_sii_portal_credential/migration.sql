-- CreateTable: portal credentials (RCV downloads) with the clave encrypted at rest.
CREATE TABLE "SiiPortalCredential" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "rut" TEXT NOT NULL,
    "claveEncrypted" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiiPortalCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SiiPortalCredential_tenantId_key" ON "SiiPortalCredential"("tenantId");

-- AddForeignKey
ALTER TABLE "SiiPortalCredential" ADD CONSTRAINT "SiiPortalCredential_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
