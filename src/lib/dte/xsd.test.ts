/**
 * Validación XSD de los documentos que emitimos contra los esquemas
 * oficiales del SII (vendored en ./xsd): EnvioDTE_v10 (envíos) y
 * DTE_v10 (documentos sueltos), incluyendo el ds:Signature.
 *
 * Motor: xmllint si está en el PATH (CI lo instala con libxml2-utils)
 * o, en su defecto, python + lxml (mismo libxml2). Sin ningún validador
 * disponible los tests se omiten: la suite local nunca falla por esto.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { makeTestCertificate } from "@/lib/sii/fixtures";
import { parseCaf } from "./caf";
import { cafFixtureXml } from "./fixtures";
import { buildTed } from "./ted";
import type { TedInput } from "./ted";
import { buildDteXml, buildEnvioDte } from "./xml";
import type { BuildDteInput } from "./xml";
import { signDteXml, signEnvioXml } from "./xmlsig";

const XSD_DIR = join(dirname(fileURLToPath(import.meta.url)), "xsd");

type Validator = (schema: string, xml: string) => void;

function available(cmd: string, args: string[]): boolean {
  try {
    execFileSync(cmd, args, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/** Schema XML a validar; imprime los errores y sale con código 1. */
const LXML_SNIPPET = [
  "import sys",
  "from lxml import etree",
  "schema = etree.XMLSchema(etree.parse(sys.argv[1]))",
  "doc = etree.parse(sys.argv[2])",
  "if not schema.validate(doc):",
  "    print('\\n'.join('line %d: %s' % (e.line, e.message) for e in schema.error_log))",
  "    sys.exit(1)",
].join("\n");

function validationError(what: string, err: unknown): never {
  const e = err as { stdout?: Buffer | string; stderr?: Buffer | string };
  const detail = [e.stdout, e.stderr]
    .map((s) => (s ? String(s).trim() : ""))
    .filter(Boolean)
    .join("\n");
  throw new Error(`${what} no valida contra el XSD del SII:\n${detail}`);
}

function findValidator(): Validator | null {
  if (available("xmllint", ["--version"])) {
    return (schema, xml) => {
      try {
        execFileSync("xmllint", ["--noout", "--schema", schema, xml], {
          stdio: ["ignore", "pipe", "pipe"],
        });
      } catch (err) {
        validationError(xml, err);
      }
    };
  }
  for (const python of ["python3", "python"]) {
    if (available(python, ["-c", "import lxml.etree"])) {
      return (schema, xml) => {
        try {
          execFileSync(python, ["-c", LXML_SNIPPET, schema, xml], {
            stdio: ["ignore", "pipe", "pipe"],
          });
        } catch (err) {
          validationError(xml, err);
        }
      };
    }
  }
  return null;
}

// ── Fixtures: DTEs firmados con CAF de prueba, envíos con carátula ──

const certificate = makeTestCertificate();
const material = {
  privateKeyPem: certificate.privateKeyPem,
  certificatePem: certificate.certificatePem,
};

const emisor = {
  rut: "76543210-3",
  razonSocial: "YELLOW TEST SPA",
  giro: "Software",
  actividadEconomica: "620200",
  direccion: "Av. Ejemplo 123",
  comuna: "Santiago",
};

function withTed(dte: BuildDteInput): BuildDteInput {
  const caf = parseCaf(cafFixtureXml({ td: String(dte.tipoDte) }));
  const tedInput: TedInput = {
    rutEmisor: dte.emisor.rut,
    tipoDte: dte.tipoDte,
    folio: dte.folio,
    fecha: dte.fechaEmision,
    rutReceptor: dte.receptor.rut,
    razonSocialReceptor: dte.receptor.razonSocial,
    mntTotal: dte.totales.total,
    primerItem: dte.items[0].nombre,
    tstEd: dte.tmstFirma,
    cafXml: caf.cafXml,
    rsaskPem: caf.rsaskPem,
  };
  return { ...dte, ted: buildTed(tedInput) };
}

/** Receptor completo (giro, dirección, comuna, correo). */
const full33: BuildDteInput = {
  tipoDte: 33,
  folio: 1002,
  fechaEmision: "2026-09-22",
  emisor,
  receptor: {
    rut: "12345678-5",
    razonSocial: "Empresas A&B Limitada",
    giro: "Comercio",
    direccion: "Calle 456",
    comuna: "Providencia",
    email: "compras@ejemplo.com",
  },
  totales: { neto: 100_000, mntExe: 0, iva: 19_000, total: 119_000 },
  items: [
    { linea: 1, nombre: "Servicio", cantidad: 1, precioUnitario: 100_000, monto: 100_000 },
  ],
  ted: "",
  tmstFirma: "2026-09-22T15:00:00",
};

/** Receptor mínimo: solo lo que exige createDteSchema. */
const min33: BuildDteInput = {
  ...full33,
  folio: 1003,
  receptor: { rut: "12345678-5", razonSocial: "Cliente Minimo SpA" },
};

/** Nota de crédito con referencia a la factura que anula. */
const nc61: BuildDteInput = {
  ...full33,
  tipoDte: 61,
  folio: 1,
  references: [
    {
      tipoDteRef: 33,
      folioRef: 1001,
      fechaRef: "2026-09-20",
      codigoRef: 1,
      motivo: "Anulacion total",
    },
  ],
};

function emitFixture(dir: string, name: string, input: BuildDteInput): void {
  const dte = signDteXml(buildDteXml(withTed(input)), material);
  const envio = buildEnvioDte({
    rutEmisor: input.emisor.rut,
    rutEnvia: input.emisor.rut,
    fechaResolucion: "2026-09-01",
    numeroResolucion: 0,
    fchFirma: input.tmstFirma,
    documentos: [dte],
  });
  const signedEnvio = signEnvioXml(envio, material);
  // Bytes ISO-8859-1, exactamente como se suben al SII.
  writeFileSync(join(dir, `envio-${name}.xml`), Buffer.from(signedEnvio, "latin1"));
  writeFileSync(join(dir, `dte-${name}.xml`), Buffer.from(dte, "latin1"));
}

const validate = findValidator();

describe.skipIf(validate === null)("XSD oficiales del SII", () => {
  let dir = "";

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "yellow-xsd-"));
    emitFixture(dir, "33-full", full33);
    emitFixture(dir, "33-min", min33);
    emitFixture(dir, "61", nc61);
  });

  afterAll(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  const cases: Array<[archivo: string, esquema: string]> = [
    ["envio-33-full.xml", "EnvioDTE_v10.xsd"],
    ["envio-33-min.xml", "EnvioDTE_v10.xsd"],
    ["envio-61.xml", "EnvioDTE_v10.xsd"],
    ["dte-33-full.xml", "DTE_v10.xsd"],
    ["dte-33-min.xml", "DTE_v10.xsd"],
    ["dte-61.xml", "DTE_v10.xsd"],
  ];

  it.each(cases)("valida %s contra %s", (archivo, esquema) => {
    expect(validate, "sin validador XSD disponible (xmllint o python+lxml)").not.toBeNull();
    validate?.(join(XSD_DIR, esquema), join(dir, archivo));
  });
});
