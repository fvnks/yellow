import { describe, expect, it } from "vitest";
import {
  crearSesionPortal,
  envolver,
  Galletas,
  NS_FACADE,
  partirRut,
  PortalError,
  urlReferencia,
} from "./portal";

describe("Galletas", () => {
  it("absorbe varios Set-Cookie y arma la cabecera", () => {
    const h = new Headers();
    h.append("set-cookie", "TOKEN=abc123; Path=/; HttpOnly");
    h.append("set-cookie", "JSESSIONID=xyz; Path=/");
    const jar = new Galletas();
    jar.absorber(new Response("", { headers: h }));
    expect(jar.cabecera()).toContain("TOKEN=abc123");
    expect(jar.cabecera()).toContain("JSESSIONID=xyz");
    expect(jar.get("TOKEN")).toBe("abc123");
  });
});

describe("envolver", () => {
  it("arma el envelope con namespace, conversationId y transactionId", () => {
    const e = envolver("TOK", `${NS_FACADE}/getResumen`, { rutEmisor: "76543210" });
    expect(e.metaData.conversationId).toBe("TOK");
    expect(e.metaData.namespace).toBe(`${NS_FACADE}/getResumen`);
    // transactionId = UUID v4.
    expect(e.metaData.transactionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(e.data).toEqual({ rutEmisor: "76543210" });
  });
});

describe("partirRut / urlReferencia", () => {
  it("separa cuerpo y DV", () => {
    expect(partirRut("76543210-3")).toEqual({ cuerpo: "76543210", dv: "3" });
    expect(partirRut("765432103")).toEqual({ cuerpo: "76543210", dv: "3" });
    expect(() => partirRut("1")).toThrow(PortalError);
  });

  it("usa misii en producción y misiir en certificación", () => {
    expect(urlReferencia("produccion")).toContain("misii.sii.cl");
    expect(urlReferencia("certificacion")).toContain("misiir.sii.cl");
  });
});

/** Stub de fetch que despacha por URL/método y registra las llamadas. */
function fetchStub(opts: {
  loginPostHtml: string;
  sesionJson?: unknown;
}) {
  const llamadas: Array<{ url: string; method: string; body?: string; headers: Headers }> = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const headers = new Headers(init?.headers);
    llamadas.push({ url, method, body: init?.body ? String(init.body) : undefined, headers });
    const conGalleta = (galleta: string, status = 200) =>
      new Response("<html>ok</html>", {
        status,
        headers: { "set-cookie": galleta, "content-type": "text/html" },
      });

    if (url.includes("IngresoRutClave") && method === "POST") {
      return new Response(opts.loginPostHtml, {
        status: 200,
        headers: { "set-cookie": "TOKEN=abc123; Path=/", "content-type": "text/html" },
      });
    }
    if (url.includes("IngresoRutClave")) return conGalleta("PREFLIGHT=1; Path=/");
    if (url.includes("autConfDataService")) {
      return Response.json({ data: {} });
    }
    if (url.includes("aaSessionService")) {
      return Response.json(opts.sesionJson ?? { data: { rut: "765432103", dv: "3" } });
    }
    if (url.includes("AutTknData")) return new Response("cb({})", { status: 200 });
    if (url.includes("consultarParametros") || url.includes("getDatosInicio")) {
      return Response.json({ data: {} });
    }
    // Cualquier otra llamada de la sesión (postJson de prueba).
    return Response.json({ data: {} });
  };
  return { fetcher, llamadas };
}

describe("crearSesionPortal", () => {
  const cred = { rut: "76543210-3", clave: "clave-de-prueba", ambiente: "certificacion" as const };

  it("recorre login + bootstrap y devuelve la sesión con TOKEN", async () => {
    const { fetcher, llamadas } = fetchStub({
      loginPostHtml: "<html><body>Bienvenido</body></html>",
    });
    const sesion = await crearSesionPortal(cred, { fetcher });

    expect(sesion.token).toBe("abc123");
    expect(sesion.rutUsuario).toBe("765432103");
    expect(sesion.baseRcv).toBe("https://www4c.sii.cl");

    // El POST de credenciales lleva rutcntr con guion y el formulario.
    const login = llamadas.find((l) => l.url.includes("IngresoRutClave") && l.method === "POST");
    expect(login?.body).toContain("rutcntr=76543210-3");
    expect(login?.body).toContain("clave=clave-de-prueba");

    // Se llamaron los 6 pasos del bootstrap.
    for (const fragmento of [
      "IngresoRutClave",
      "autConfDataService",
      "aaSessionService",
      "AutTknData",
      "consultarParametros",
      "getDatosInicio",
    ]) {
      expect(llamadas.some((l) => l.url.includes(fragmento))).toBe(true);
    }

    // El envelope de getDatosInicio usa el conversationId = TOKEN.
    const inicio = llamadas.find((l) => l.url.includes("getDatosInicio"));
    const body = JSON.parse(inicio!.body!) as {
      metaData: { conversationId: string; namespace: string };
    };
    expect(body.metaData.conversationId).toBe("abc123");
    expect(body.metaData.namespace).toBe(`${NS_FACADE}/getDatosInicio`);

    // postJson de la sesión manda las cookies y decodifica JSON.
    const r = (await sesion.postJson("https://www4c.sii.cl/x", { a: 1 })) as { data: unknown };
    expect(r.data).toEqual({});
    const ultima = llamadas[llamadas.length - 1];
    expect(String(ultima.headers.get("cookie") ?? "")).toContain("TOKEN=abc123");
  });

  it("detecta un desafío del SII (Queue-it) y lanza código desafio", async () => {
    const { fetcher } = fetchStub({
      loginPostHtml: "<html><script src='queue-it.js'></script>queue-it</html>",
    });
    await expect(crearSesionPortal(cred, { fetcher })).rejects.toMatchObject({
      name: "PortalError",
      codigo: "desafio",
    });
  });

  it("detecta credenciales rechazadas (vuelve al formulario)", async () => {
    const { fetcher } = fetchStub({
      loginPostHtml: '<html><form><input id="clave" name="clave"/></form></html>',
    });
    await expect(crearSesionPortal(cred, { fetcher })).rejects.toMatchObject({
      name: "PortalError",
      codigo: "credenciales",
    });
  });

  it("reporta caídas de red como PortalError red", async () => {
    const fetcher: typeof fetch = async () => {
      throw new Error("ECONNRESET");
    };
    await expect(crearSesionPortal(cred, { fetcher })).rejects.toMatchObject({
      name: "PortalError",
      codigo: "red",
    });
  });
});
