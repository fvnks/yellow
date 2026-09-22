import { describe, expect, it } from "vitest";
import { MockDteSigner, MockSiiClient } from "./mock";

const validEnvio =
  `<?xml version="1.0"?>\n<EnvioDTE><SetDTE><DTE><Documento/></DTE></SetDTE></EnvioDTE>`;

describe("MockSiiClient", () => {
  it("accepts a well-formed envío and issues sequential track IDs", async () => {
    const client = new MockSiiClient();
    const first = await client.enviar(validEnvio);
    const second = await client.enviar(validEnvio);
    expect(first.trackId).toBe("MOCK-00000001");
    expect(second.trackId).toBe("MOCK-00000002");
  });

  it("rejects malformed envíos", async () => {
    const client = new MockSiiClient();
    await expect(client.enviar("<otro/>")).rejects.toThrow(/Envío inválido/);
  });

  it("reports ACEPTADO for its own track IDs, RECHAZADO for unknown ones", async () => {
    const client = new MockSiiClient();
    const { trackId } = await client.enviar(validEnvio);
    await expect(client.consultarEstado(trackId)).resolves.toMatchObject({
      estado: "ACEPTADO",
    });
    await expect(client.consultarEstado("12345")).resolves.toMatchObject({
      estado: "RECHAZADO",
    });
  });
});

describe("MockDteSigner", () => {
  const xml =
    `<DTE version="1.0"><Documento><Signature>` +
    `<SignatureValue></SignatureValue></Signature></Documento></DTE>`;

  it("fills the signature placeholder deterministically", async () => {
    const signer = new MockDteSigner();
    const signed = await signer.firmar(xml);
    expect(signed).not.toContain("<SignatureValue></SignatureValue>");
    const value = signed.match(/<SignatureValue>([^<]+)<\/SignatureValue>/)?.[1];
    expect(value).toBeTruthy();
    expect(await signer.firmar(xml)).toBe(signed);
  });

  it("fails loudly when the placeholder is missing", async () => {
    await expect(new MockDteSigner().firmar("<DTE/>")).rejects.toThrow(
      /placeholder/,
    );
  });

  it("signs the envelope (carátula slot) as well as the DTE", async () => {
    const signer = new MockDteSigner();
    const envio =
      `<EnvioDTE><SetDTE/></EnvioDTE><Signature><SignatureValue></SignatureValue></Signature>`;
    const signed = await signer.firmarEnvio(envio);
    expect(signed).not.toContain("<SignatureValue></SignatureValue>");
    expect(await signer.firmarEnvio(envio)).toBe(signed);
    await expect(signer.firmarEnvio("<EnvioDTE/>")).rejects.toThrow(
      /placeholder/,
    );
  });

  it("turns a raw seed response into a signed getToken payload", async () => {
    const signer = new MockDteSigner();
    const signed = await signer.firmarSemilla(
      `<?xml version="1.0"?><SII:RESPUESTA><SEMILLA>123456</SEMILLA></SII:RESPUESTA>`,
    );
    expect(signed).toContain("<getToken>");
    expect(signed).toContain("<Semilla>123456</Semilla>");
    expect(signed).not.toContain("<SignatureValue></SignatureValue>");
  });

  it("propagates a missing seed as an error", async () => {
    await expect(
      new MockDteSigner().firmarSemilla(`<SII:RESPUESTA><ESTADO>-1</ESTADO></SII:RESPUESTA>`),
    ).rejects.toThrow(/SEMILLA|semilla/i);
  });
});
