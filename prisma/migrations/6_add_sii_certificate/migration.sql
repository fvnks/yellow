-- CreateTable: SII digital certificate (.p12) stored encrypted at rest.
CREATE TABLE "SiiCertificate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "p12Encrypted" TEXT NOT NULL,
    "passwordEncrypted" TEXT NOT NULL,
    "subject" TEXT,
    "rut" TEXT,
    "issuer" TEXT,
    "serialNumber" TEXT,
    "notBefore" TIMESTAMP(3),
    "notAfter" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiiCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiiCertificate_tenantId_active_idx" ON "SiiCertificate"("tenantId", "active");

-- AddForeignKey
ALTER TABLE "SiiCertificate" ADD CONSTRAINT "SiiCertificate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
