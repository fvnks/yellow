import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { registroDelPeriodo } from "@/lib/dte/descarga";
import { periodoBounds } from "@/lib/dte/libro-periodo";
import { ETIQUETA_TIPO } from "@/lib/dte/pdf";
import { getAuthContext } from "@/lib/session";
import { ModuleNav } from "@/components/module-nav";

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

/** Chip de estado local (mismo vocabulario que /libros). */
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

/** "2026-09-15" → "15-09-2026" (sin depender de la TZ del servidor). */
function fechaEs(fecha: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha || "—";
  return `${fecha.slice(8)}-${fecha.slice(5, 7)}-${fecha.slice(0, 4)}`;
}

/**
 * Descargas del SII: registro de compras/ventas del periodo con XML y PDF
 * por documento. El registro viene del portal (credenciales guardadas) o
 * se compone con los documentos de Yellow en modo simulado.
 */
export default async function DescargasPage({
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
  const params = await searchParams;
  const sentido = params.sentido === "ENTRADA" ? "ENTRADA" : "SALIDA";

  const ahora = new Date();
  const periodoActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;
  const periodo =
    params.periodo && periodoBounds(params.periodo)
      ? params.periodo
      : periodoActual;

  const [registro, tenant] = await Promise.all([
    registroDelPeriodo(tenantId, sentido, periodo),
    db.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    }),
  ]);

  const docs = registro.documentos;
  const tot = docs.reduce(
    (acc, d) => ({
      docs: acc.docs + 1,
      anulados: acc.anulados + (d.estado === "ANULADO" ? 1 : 0),
      neto: acc.neto + d.neto,
      iva: acc.iva + d.iva,
      total: acc.total + d.total,
    }),
    { docs: 0, anulados: 0, neto: 0, iva: 0, total: 0 },
  );

  const periodos = [...new Set([periodo, ...ultimosPeriodos()])];
  const lado = sentido === "SALIDA" ? "ventas" : "compras";
  const href = (s: "SALIDA" | "ENTRADA") => `/descargas?sentido=${s}&periodo=${periodo}`;
  const base = `/api/tenants/${tenantId}/descargas?sentido=${sentido}&periodo=${periodo}`;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Descargas del SII</h1>
          <p className="text-sm text-ink-soft">
            {tenant?.name} · registro de {lado} de {etiquetaPeriodo(periodo)} ·{" "}
            <span
              className={
                registro.modo === "real" ? "chip chip-ok" : "chip chip-orange"
              }
            >
              {registro.modo === "real" ? "registro del SII" : "modo simulado"}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ModuleNav active="descargas" />
          <Link href="/dashboard" className="btn btn-ghost">
            ← Panel
          </Link>
        </div>
      </header>

      {registro.aviso && <p className="alert alert-error">{registro.aviso}</p>}

      {registro.modo === "mock" && !registro.aviso && (
        <p className="text-sm text-ink-soft">
          Sin credenciales del portal: este registro lista los documentos de
          Yellow. Configura la clave tributaria en{" "}
          <Link href="/facturacion" className="text-blue hover:underline">
            Facturación
          </Link>{" "}
          (OWNER o ADMIN) para descargar el registro real del SII.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Link
            href={href("SALIDA")}
            className={sentido === "SALIDA" ? "btn btn-primary" : "btn btn-ghost"}
          >
            Ventas
          </Link>
          <Link
            href={href("ENTRADA")}
            className={sentido === "ENTRADA" ? "btn btn-primary" : "btn btn-ghost"}
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
            href={`${base}&formato=csv`}
            className="btn btn-primary"
            download={`registro-${lado}-${periodo}.csv`}
          >
            Descargar CSV
          </a>
        </div>
      </div>

      {docs.length === 0 ? (
        <p className="text-sm text-ink-soft">
          El registro de {lado} de {etiquetaPeriodo(periodo)} está vacío
          {registro.modo === "mock"
            ? ": no hay documentos aceptados ni anulados en ese periodo."
            : " según el SII para este periodo."}
        </p>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="panel p-4">
              <p className="text-xs text-ink-soft">Documentos</p>
              <p className="mt-1 text-xl font-semibold text-ink">{tot.docs}</p>
              <p className="text-xs text-ink-soft">{tot.anulados} anulados</p>
            </div>
            <div className="panel p-4">
              <p className="text-xs text-ink-soft">Neto</p>
              <p className="mt-1 text-xl font-semibold text-ink">
                {clp.format(tot.neto)}
              </p>
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
              Documentos del registro
            </h2>
            <div className="overflow-x-auto rounded-md border border-line">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Folio</th>
                    <th>Contraparte</th>
                    <th>Estado</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">Archivos</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d) => (
                    <tr key={`${d.tipoDte}-${d.folio}`}>
                      <td className="text-ink-soft">{fechaEs(d.fecha)}</td>
                      <td>
                        {ETIQUETA_TIPO[d.tipoDte] ?? d.tipoDte}{" "}
                        <span className="text-xs text-ink-soft">({d.tipoDte})</span>
                      </td>
                      <td className="font-mono">{d.folio}</td>
                      <td className="max-w-56 truncate">
                        {d.contraparteRazonSocial ?? "—"}
                        <span className="ml-2 text-xs text-ink-soft">
                          {d.contraparteRut ?? ""}
                        </span>
                      </td>
                      <td>
                        {d.estado ? (
                          <span className={CHIP[d.estado] ?? "chip chip-muted"}>
                            {d.estado}
                          </span>
                        ) : (
                          <span
                            className="chip chip-muted"
                            title="Sólo consta en el registro del SII; no está en Yellow"
                          >
                            RCV
                          </span>
                        )}
                      </td>
                      <td className="text-right font-medium">
                        {clp.format(d.total)}
                      </td>
                      <td>
                        {d.xmlLocal ? (
                          <span className="flex justify-end gap-1">
                            <a
                              href={`${base}&formato=xml&tipo=${d.tipoDte}&folio=${d.folio}`}
                              className="btn btn-ghost"
                              download={`dte-${d.tipoDte}-${d.folio}.xml`}
                            >
                              XML
                            </a>
                            <a
                              href={`${base}&formato=pdf&tipo=${d.tipoDte}&folio=${d.folio}`}
                              className="btn btn-ghost"
                              download={`dte-${d.tipoDte}-${d.folio}.pdf`}
                            >
                              PDF
                            </a>
                          </span>
                        ) : (
                          <span
                            className="block text-right text-ink-soft"
                            title={d.motivoSinXml}
                          >
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-ink-soft">
              Cuando Archivos muestra «—» el XML no está en Yellow: en compras,
              los XML de proveedores sólo los sirve el portal del SII (Consulta
              de documentos); en ventas, el documento no pasó por Yellow. El PDF
              se genera desde el XML almacenado (el SII no ofrece un servicio de
              PDF).
            </p>
          </section>
        </>
      )}
    </div>
  );
}
