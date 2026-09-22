import { describe, expect, it } from "vitest";
import { buildDteXml, buildEnvioDte } from "@/lib/dte/xml";
import type { BuildDteInput } from "@/lib/dte/xml";
import {
  verifyDteSignature,
  verifyEnvioSignature,
  verifySeedSignature,
} from "@/lib/dte/xmlsig";
import { makeTestCertificate } from "./fixtures";
import { loadPkcs12 } from "./pkcs12";
import { SiiDteSigner } from "./signer";

const base: BuildDteInput = {
  tipoDte: 33,
  folio: 1002,
  fechaEmision: "2026-09-22",
  emisor: {
    rut: "76543210-3",
    razonSocial: "E2E TEST SPA",
    giro: "Software",
    actividadEconomica: "620200",
    direccion: "Av. Siempre 123",
    comuna: "Santiago",
  },
  receptor: {
    rut: "12345678-5",
    razonSocial: "Cliente Ltda",
    giro: "Comercio",
  },
  totales: { neto: 1_000, mntExe: 0, iva: 190, total: 1_190 },
  items: [{ linea: 1, nombre: "Servicio", cantidad: 1, precioUnitario: 1_000, monto: 1_000 }],
  ted: '<TED version="1.0"><DD><RE>76543210-3</RE></DD></TED>',
  tmstFirma: "2026-09-22T12:00:00",
};

const seedResponse = `<SII:RESPUESTA><SEMILLA>555777</SEMILLA></SII:RESPUESTA>`;

describe("SiiDteSigner (certificate round trip)", () => {
  it("signs DTE, envelope and seed from a loaded .p12", async () => {
    const fixture = makeTestCertificate({ rut: "76.543.210-3" });
    const material = loadPkcs12(fixture.p12, fixture.password);
    const signer = new SiiDteSigner(material);

    const signed = await signer.firmar(buildDteXml(base));
    expect(verifyDteSignature(signed)).toEqual({ digestOk: true, signatureOk: true });

    const envio = buildEnvioDte({
      rutEmisor: "76543210-3",
      rutEnvia: "76543210-3",
      fechaResolucion: "2025-06-01",
      numeroResolucion: 0,
      fchFirma: "2026-09-22T12:00:01",
      documentos: [signed],
    });
    const signedEnvio = await signer.firmarEnvio(envio);
    expect(verifyEnvioSignature(signedEnvio)).toEqual({ digestOk: true, signatureOk: true });

    const signedSeed = await signer.firmarSemilla(seedResponse);
    expect(verifySeedSignature(signedSeed)).toEqual({ digestOk: true, signatureOk: true });
  });

  it("propagates seed errors from the SII response", async () => {
    const fixture = makeTestCertificate();
    const signer = new SiiDteSigner(loadPkcs12(fixture.p12, fixture.password));
    await expect(
      signer.firmarSemilla("<SII:RESPUESTA><ESTADO>-1</ESTADO></SII:RESPUESTA>"),
    ).rejects.toThrow(/semilla/i);
  });
});
