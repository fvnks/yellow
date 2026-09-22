import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  RealSiiClient,
  SiiClientError,
  clearSiiTokenCache,
  siiAmbiente,
} from "./client";

// ── Fake SII (seed → token → upload → estado) ─────────────────────────

interface Call {
  url: string;
  init?: RequestInit;
}

function escapeSoap(xml: string): string {
  return xml
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function envelope(returnName: string, inner: string): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">` +
    `<soapenv:Body><ns1:${returnName} xmlns:ns1="http://DefaultNamespace">` +
    `${escapeSoap(inner)}</ns1:${returnName}></soapenv:Body></soapenv:Envelope>`
  );
}

const SEED_XML = `<?xml version="1.0" encoding="UTF-8"?><SII:RESPUESTA xmlns:SII="http://www.sii.cl/SiiDte"><SEMILLA>123456</SEMILLA></SII:RESPUESTA>`;
const TOKEN_XML = `<RESPUESTA><TOKEN>tok-abc123</TOKEN></RESPUESTA>`;

function makeFetch(estado: string, glosa?: string) {
  const calls: Call[] = [];
  const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.includes("CrSeed")) {
      return new Response(envelope("getSeedReturn", SEED_XML), { status: 200 });
    }
    if (url.includes("GetTokenFromSeed")) {
      return new Response(envelope("getTokenReturn", TOKEN_XML), { status: 200 });
    }
    if (url.includes("DTEUpload")) {
      return new Response(
        `<RESPUESTA><STATUS>0</STATUS><TRACKID>987654321</TRACKID></RESPUESTA>`,
        { status: 200 },
      );
    }
    if (url.includes("QueryEstUp")) {
      const resp =
        `<RESPUESTA><RESP_HDR><ESTADO>${estado}</ESTADO>` +
        (glosa ? `<GLOSA>${glosa}</GLOSA>` : "") +
        `</RESP_HDR></RESPUESTA>`;
      return new Response(envelope("getEstUpReturn", resp), { status: 200 });
    }
    return new Response("not found", { status: 404 });
  });
  return { fetchImpl, calls };
}

const ENVIO = `<?xml version="1.0" encoding="ISO-8859-1"?>
<EnvioDTE version="1.0" xmlns="http://www.sii.cl/SiiDte">
<SetDTE ID="SetDoc"></SetDTE>
</EnvioDTE>`;

function makeClient(fetchImpl: unknown, cacheKey = `test-${Math.random()}`) {
  return new RealSiiClient({
    ambiente: "certificacion",
    rut: "765432103",
    cacheKey,
    signSeed: () =>
      '<?xml version="1.0"?><getToken><item><Semilla>123456</Semilla></item></getToken>',
    fetchImpl: fetchImpl as never,
  });
}

beforeEach(() => clearSiiTokenCache());

describe("siiAmbiente", () => {
  it("defaults to certificación and switches with SII_ENV", () => {
    const prev = process.env.SII_ENV;
    try {
      delete process.env.SII_ENV;
      expect(siiAmbiente()).toBe("certificacion");
      process.env.SII_ENV = "produccion";
      expect(siiAmbiente()).toBe("produccion");
    } finally {
      if (prev === undefined) delete process.env.SII_ENV;
      else process.env.SII_ENV = prev;
    }
  });
});

describe("RealSiiClient.enviar", () => {
  it("gets a token (seed + getToken) and uploads multipart with Cookie TOKEN", async () => {
    const { fetchImpl, calls } = makeFetch("SOK");
    const client = makeClient(fetchImpl);

    const { trackId } = await client.enviar(ENVIO);
    expect(trackId).toBe("987654321");

    const urls = calls.map((c) => c.url);
    expect(urls[0]).toContain("CrSeed.jws");
    expect(urls[1]).toContain("GetTokenFromSeed.jws");
    expect(urls[2]).toContain("/cgi_dte/UPL/DTEUpload");

    const upload = calls[2];
    const headers = upload.init?.headers as Record<string, string>;
    expect(headers.Cookie).toBe("TOKEN=tok-abc123");
    expect(headers["Content-Type"]).toContain("multipart/form-data; boundary=");

    const body = upload.init?.body as Buffer;
    const text = body.toString("latin1");
    expect(text).toContain('name="rutSender"');
    expect(text).toContain("\r\n\r\n76543210\r\n");
    expect(text).toContain('name="dvCompany"');
    expect(text).toContain("\r\n\r\n3\r\n");
    expect(text).toContain('name="archivo"; filename="envio.xml"');
    expect(text).toContain("<EnvioDTE");
    expect(text.trimEnd().endsWith("--")).toBe(true);
  });

  it("reuses the cached token across calls (single seed round trip)", async () => {
    const { fetchImpl, calls } = makeFetch("SOK");
    const client = makeClient(fetchImpl);

    await client.enviar(ENVIO);
    await client.enviar(ENVIO);
    expect(calls.filter((c) => c.url.includes("CrSeed"))).toHaveLength(1);
    expect(calls.filter((c) => c.url.includes("GetTokenFromSeed"))).toHaveLength(1);
  });

  it("refuses envelopes outside ISO-8859-1 before touching the network", async () => {
    const { fetchImpl, calls } = makeFetch("SOK");
    const client = makeClient(fetchImpl);
    await expect(client.enviar("<EnvioDTE>emoji 😀</EnvioDTE>")).rejects.toThrow(
      /ISO-8859-1/,
    );
    expect(calls).toHaveLength(0);
  });

  it("surfaces upload failures with the SII's explanation", async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("CrSeed")) return new Response(envelope("getSeedReturn", SEED_XML));
      if (url.includes("GetTokenFromSeed")) return new Response(envelope("getTokenReturn", TOKEN_XML));
      return new Response("<ERROR>Token inválido</ERROR>", { status: 500 });
    });
    const client = makeClient(fetchImpl);
    await expect(client.enviar(ENVIO)).rejects.toThrow(SiiClientError);
    await expect(client.enviar(ENVIO)).rejects.toThrow(/HTTP 500/);
  });
});

describe("RealSiiClient.consultarEstado", () => {
  it("maps SII estado codes", async () => {
    const cases: Array<[string, string, string | undefined]> = [
      ["SOK", "ACEPTADO", undefined],
      ["RPR", "ACEPTADO", "Con reparos"],
      ["RSC", "RECHAZADO", undefined],
      ["EPR", "PENDIENTE", undefined],
      ["XYZ", "PENDIENTE", undefined],
    ];
    for (const [code, expected, glosa] of cases) {
      clearSiiTokenCache();
      const { fetchImpl } = makeFetch(code, glosa);
      const client = makeClient(fetchImpl);
      const result = await client.consultarEstado("12345");
      expect(result.estado, `código ${code}`).toBe(expected);
      if (glosa) expect(result.glosa).toBe(glosa);
    }
  });

  it("keeps the SII glosa for still-processing documents", async () => {
    const { fetchImpl } = makeFetch("EPR", "Documento en proceso de validación");
    const client = makeClient(fetchImpl);
    const result = await client.consultarEstado("12345");
    expect(result).toEqual({
      estado: "PENDIENTE",
      glosa: "Documento en proceso de validación",
    });
  });

  it("rejects non-numeric track IDs (mock IDs cannot leak into real mode)", async () => {
    const { fetchImpl, calls } = makeFetch("SOK");
    const client = makeClient(fetchImpl);
    await expect(client.consultarEstado("MOCK-00000001")).rejects.toThrow(/TrackID/);
    expect(calls).toHaveLength(0);
  });
});
