import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { agruparPorTipo, documentosLibro } from "@/lib/dte/libro";
import {
  documentosDelPeriodo,
  nombreLibro,
  periodoBounds,
} from "@/lib/dte/libro-periodo";
import { getAuthContext } from "@/lib/session";
import { modulosActivos } from "@/lib/modules";

export const dynamic = "force-dynamic";

const clp = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const TIPO_LABEL: Record<number, string> = {
  33: "Factura",
  34: "F. exenta",
  52: "Guía",
  46: "F. compra",
  56: "N. débito",
  61: "N. crédito",
};

/** Solo los estados que entran al libro. */
const CHIP: Record<string, string> = {
  ACEPTADO: "chip chip-ok",
  ANULADO: "chip chip-muted",
};

function etiquetaPeriodo(periodo: string): string {
  const [y, m] = periodo.split("-");
  return `${MESES[Number(m) - 1]} ${y}`;
}

/** Últimos 13 meses (incluye el actual), de más reciente a más antiguo. */
function ultimosPeriodos(): string[] {
  const base = new Date();
  const out: string[] = [];
  for (let i = 0; i < 13; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

/**
 * Libro de Compras y Ventas: resumen del periodo con el mismo conjunto de
 * documentos que entra al XML (ACEPTADO/ANULADO) y descarga del archivo
 * oficial listo para "Upload XML de libros" en el SII.
 */
export default async function LibrosPage({
  searchParams,
}: {
  searchParams: Promise<{ sentido?: string; periodo?: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const active = ctx.memberships.find(
    (m) => m.tenantId === ctx.session.activeTenantId,
  );
  if (!active) redirect("/dashboard");

  const tenantId = active.tenantId;
  const activos = await modulosActivos(tenantId);
  if (!activos.has("LIBROS")) redirect("/dashboard");

  const params = await searchParams;
  const sentido = params.sentido === "ENTRADA" ? "ENTRADA" : "SALIDA";

  const ahora = new Date();
  const periodoActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;
  const periodo =
    params.periodo && periodoBounds(params.periodo)
      ? params.periodo
      : periodoActual;

  const [documentos, tenant] = await Promise.all([
    documentosDelPeriodo(tenantId, sentido, periodo),
    db.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, resolucionFecha: true, resolucionNumero: true },
    }),
  ]);

  const docs = documentosLibro(documentos);
  const grupos = agruparPorTipo(documentos);
  const tot = docs.reduce(
    (acc, d) => ({
      docs: acc.docs + 1,
      anulados: acc.anulados + (d.estado === "ANULADO" ? 1 : 0),
      neto: acc.neto + d.neto,
      exento: acc.exento + d.mntExe,
      iva: acc.iva + d.iva,
      total: acc.total + d.total,
    }),
    { docs: 0, anulados: 0, neto: 0, exento: 0, iva: 0, total: 0 },
  );

  const periodos = [...new Set([periodo, ...ultimosPeriodos()])];
  const perfilResolucion = !!(
    tenant?.resolucionFecha && tenant.resolucionNumero != null
  );
  const href = (s: "SALIDA" | "ENTRADA") =>
    `/libros?sentido=${s}&periodo=${periodo}`;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Libros</h1>
          <p className="text-sm text-ink-soft">
            {tenant?.name} · libro de{" "}
            {sentido === "SALIDA" ? "ventas" : "compras"} de{" "}
            {etiquetaPeriodo(periodo)}
          </p>
        </div>
      </header>

      {!perfilResolucion && (
        <p className="alert alert-warn">
          Falta la resolución del SII en el perfil del emisor (fecha y número):
          no se puede generar el XML hasta completarla.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Link
            href={href("SALIDA")}
            className={
              sentido === "SALIDA" ? "btn btn-primary" : "btn btn-ghost"
            }
          >
            Ventas
          </Link>
          <Link
            href={href("ENTRADA")}
            className={
              sentido === "ENTRADA" ? "btn btn-primary" : "btn btn-ghost"
            }
          >
            Compras
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <form method="GET" className="flex items-center gap-2">
            <input type="hidden" name="sentido" value={sentido} />
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              Periodo
              <select name="periodo" defaultValue={periodo} className="field w-auto">
                {periodos.map((p) => (
                  <option key={p} value={p}>
                    {etiquetaPeriodo(p)}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn btn-ghost">
              Ver
            </button>
          </form>
          <a
            href={`/api/tenants/${tenantId}/libros?sentido=${sentido}&periodo=${periodo}`}
            className="btn btn-primary"
            download={nombreLibro(sentido, periodo)}
          >
            Descargar XML
          </a>
          <a
            href={`/api/tenants/${tenantId}/descargas?sentido=${sentido}&periodo=${periodo}&formato=csv`}
            className="btn btn-ghost"
            download={`registro-${sentido === "SALIDA" ? "ventas" : "compras"}-${periodo}.csv`}
          >
            Registro CSV
          </a>
        </div>
      </div>

      {docs.length === 0 ? (
        <p className="text-sm text-ink-soft">
          No hay documentos aceptados ni anulados en {etiquetaPeriodo(periodo)}{" "}
          ({sentido === "SALIDA" ? "ventas" : "compras"}). Elige otro periodo o
          emite documentos primero.
        </p>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="panel p-4">
              <p className="text-xs text-ink-soft">Documentos</p>
              <p className="mt-1 text-xl font-semibold text-ink">{tot.docs}</p>
              <p className="text-xs text-ink-soft">
                {tot.anulados} anulados
              </p>
            </div>
            <div className="panel p-4">
              <p className="text-xs text-ink-soft">Neto</p>
              <p className="mt-1 text-xl font-semibold text-ink">
                {clp.format(tot.neto)}
              </p>
              {tot.exento !== 0 && (
                <p className="text-xs text-ink-soft">
                  exento {clp.format(tot.exento)}
                </p>
              )}
            </div>
            <div className="panel p-4">
              <p className="text-xs text-ink-soft">IVA</p>
              <p className="mt-1 text-xl font-semibold text-ink">
                {clp.format(tot.iva)}
              </p>
              <p className="text-xs text-ink-soft">19%</p>
            </div>
            <div className="panel p-4">
              <p className="text-xs text-ink-soft">Total</p>
              <p className="mt-1 text-xl font-semibold text-ink">
                {clp.format(tot.total)}
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-medium text-ink">
              Totales por tipo de documento
            </h2>
            <div className="overflow-x-auto rounded-md border border-line">
              <table className="tbl">
                <thead>
                  <tr>
                    <th scope="col">Tipo</th>
                    <th scope="col" className="text-right">Docs</th>
                    <th scope="col" className="text-right">Anulados</th>
                    <th scope="col" className="text-right">Exento</th>
                    <th scope="col" className="text-right">Neto</th>
                    <th scope="col" className="text-right">IVA</th>
                    <th scope="col" className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {grupos.map((g) => (
                    <tr key={g.tipoDte}>
                      <td>
                        {TIPO_LABEL[g.tipoDte] ?? g.tipoDte}{" "}
                        <span className="text-xs text-ink-soft">
                          ({g.tipoDte})
                        </span>
                      </td>
                      <td className="text-right">{g.totDoc}</td>
                      <td className="text-right text-ink-soft">
                        {g.totAnulado || "—"}
                      </td>
                      <td className="text-right">{clp.format(g.totMntExe)}</td>
                      <td className="text-right">{clp.format(g.totMntNeto)}</td>
                      <td className="text-right">{clp.format(g.totMntIva)}</td>
                      <td className="text-right font-medium">
                        {clp.format(g.totMntTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-medium text-ink">
              Documentos del periodo
            </h2>
            <div className="overflow-x-auto rounded-md border border-line">
              <table className="tbl">
                <thead>
                  <tr>
                    <th scope="col">Fecha</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Folio</th>
                    <th scope="col">Contraparte</th>
                    <th scope="col">Estado</th>
                    <th scope="col" className="text-right">Neto</th>
                    <th scope="col" className="text-right">IVA</th>
                    <th scope="col" className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d) => (
                    <tr key={`${d.tipoDte}-${d.folio}`}>
                      <td className="text-ink-soft">
                        {new Date(d.fechaEmision).toLocaleDateString("es-CL")}
                      </td>
                      <td>
                        {TIPO_LABEL[d.tipoDte] ?? d.tipoDte}{" "}
                        <span className="text-xs text-ink-soft">
                          ({d.tipoDte})
                        </span>
                      </td>
                      <td className="font-mono">{d.folio}</td>
                      <td className="max-w-56 truncate">
                        {d.contraparteRazonSocial ?? "—"}
                        <span className="ml-2 text-xs text-ink-soft">
                          {d.contraparteRut ?? ""}
                        </span>
                      </td>
                      <td>
                        <span className={CHIP[d.estado] ?? "chip chip-muted"}>
                          {d.estado}
                        </span>
                      </td>
                      <td className="text-right">{clp.format(d.neto)}</td>
                      <td className="text-right">{clp.format(d.iva)}</td>
                      <td className="text-right font-medium">
                        {clp.format(d.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-ink-soft">
              Estos son exactamente los {docs.length} documentos que viajan en{" "}
              <span className="font-mono">
                {nombreLibro(sentido, periodo)}
              </span>
              .
            </p>
          </section>
        </>
      )}
    </div>
  );
}
