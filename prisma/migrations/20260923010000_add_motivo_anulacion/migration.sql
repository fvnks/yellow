-- Anulación de DTE (FAQ SII 001.003.2167.006): registrar en el documento
-- original el método + motivo de su anulación (NC/ND emitida, folio anulado
-- ante el SII o carta de anulación).
ALTER TABLE "DteDocument" ADD COLUMN "motivoAnulacion" TEXT;
