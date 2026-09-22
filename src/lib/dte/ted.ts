/**
 * TED — Timbre Electrónico del DTE.
 *
 * Per SII "Instructivo Técnico" A.2: the stamp is an RSA-SHA1 signature
 * (FRMT) over the compact `<DD>…</DD>` payload encoded as ISO-8859-1 bytes,
 * using the RSASK private key delivered inside the CAF. The embedded CAF
 * block must be included exactly as issued, without modification.
 */

import { createSign } from "node:crypto";
import { esc } from "@/lib/dte/xml";

export interface TedInput {
  /** Hyphenated emisor RUT ("76237911-5"). */
  rutEmisor: string;
  tipoDte: number;
  folio: number;
  /** Emission date "YYYY-MM-DD". */
  fecha: string;
  /** Hyphenated receptor RUT. */
  rutReceptor: string;
  /** Receptor razón social, max 40 chars per spec. */
  razonSocialReceptor: string;
  /** Document grand total (MntTotal). */
  mntTotal: number;
  /** First detail line description, max 40 chars per spec. */
  primerItem: string;
  /** Stamp generation timestamp "YYYY-MM-DDTHH:MM:SS". */
  tstEd: string;
  /** Exact `<CAF version="…">…</CAF>` block from parseCaf(). */
  cafXml: string;
  /** RSASK private key PEM from parseCaf(). */
  rsaskPem: string;
}

/** Build the `<DD>` payload that gets signed (compact, XML-escaped). */
export function buildTedDd(input: TedInput): string {
  const it1 = esc(input.primerItem.slice(0, 40));
  const rsr = esc(input.razonSocialReceptor.slice(0, 40));
  return (
    `<DD><RE>${esc(input.rutEmisor)}</RE>` +
    `<TD>${input.tipoDte}</TD>` +
    `<F>${input.folio}</F>` +
    `<FE>${input.fecha}</FE>` +
    `<RR>${esc(input.rutReceptor)}</RR>` +
    `<RSR>${rsr}</RSR>` +
    `<MNT>${input.mntTotal}</MNT>` +
    `<IT1>${it1}</IT1>` +
    `${input.cafXml}` +
    `<TSTED>${input.tstEd}</TSTED>` +
    `</DD>`
  );
}

/**
 * Build the full `<TED>` element with its FRMT signature.
 * NOTE: the SII mandates ISO-8859-1; characters outside Latin-1 cannot
 * be represented (validation against the XSD happens during certification).
 */
export function buildTed(input: TedInput): string {
  const dd = buildTedDd(input);
  const signature = createSign("RSA-SHA1")
    .update(Buffer.from(dd, "latin1"))
    .sign(input.rsaskPem, "base64");
  return (
    `<TED version="1.0">\n` +
    `${dd}\n` +
    `<FRMT algoritmo="SHA1withRSA">${signature}</FRMT>\n` +
    `</TED>`
  );
}
