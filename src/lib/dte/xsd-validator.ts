/**
 * Buscador de validador XSD para los tests: xmllint si está en el PATH
 * (CI lo instala con libxml2-utils) o, en su defecto, python + lxml
 * (mismo libxml2). Sin ningún validador disponible se devuelve null y
 * los tests que lo usan se omiten: la suite local nunca falla por esto.
 *
 * Uso exclusivo de los *.test.ts — no se importa desde el código de la app.
 */
import { execFileSync } from "node:child_process";

export type Validator = (schema: string, xml: string) => void;

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

export function findValidator(): Validator | null {
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
