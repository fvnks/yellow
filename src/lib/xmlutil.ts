/**
 * Minimal XML helpers shared by the DTE signer and the SII SOAP client.
 * Our XML is machine-generated with a restricted syntax (double-quoted
 * attributes, no CDATA/comments), so simple scanning is enough here —
 * full parsing happens only on the SII's side.
 */

/** XML predefined entities + numeric character references. */
const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

/** Decode the 5 predefined entities and numeric refs (single pass). */
export function unescapeXmlText(value: string): string {
  return value.replace(
    /&(amp|lt|gt|quot|apos|#x[0-9A-Fa-f]+|#\d+);/g,
    (match, name: string) => {
      if (name.startsWith("#")) {
        const code = name[1] === "x" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
        return Number.isNaN(code) ? match : String.fromCodePoint(code);
      }
      return ENTITIES[name];
    },
  );
}

/**
 * First `<…:LOCAL>text</…:LOCAL>` content by local name, tolerating a
 * namespace prefix (`<SII:ESTADO>` / `<ESTADO>`) and attributes on the
 * opening tag (`<ns1:getSeedReturn xmlns:ns1="…">`). Returns the raw
 * inner text (entities intact) or null when the tag is absent.
 */
export function findTag(xml: string, localName: string): string | null {
  const pattern = new RegExp(
    `<[A-Za-z0-9_.-]*:?${localName}(?:\\s[^>]*)?>([\\s\\S]*?)</[A-Za-z0-9_.-]*:?${localName}\\s*>`,
  );
  const match = pattern.exec(xml);
  return match ? match[1] : null;
}
