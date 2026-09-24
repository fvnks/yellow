import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { periodoBounds } from "@/lib/dte/libro-periodo";
import { resumenPorDimension } from "@/lib/dte/resumen";
import { modulosActivos } from "@/lib/modules";
import { getAuthContext } from "@/lib/session";

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

/** Barra horizontal proporcional al máximo de su lista. */
function Barra({ pct }: { pct: number }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-block">
      <div
        className="h-1.5 rounded-full bg-blue-bright"
        style={{ width: `${Math.min(Math.max(pct, 2), 100)}%` }}
      />
    </div>
  );
}

/**
 * Reportes del periodo: mismo conjunto de documentos que el libro
 * (ACEPTADO/ANULADO), desglosado por vendedor, área, categoría y proveedor.
 */
export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const active = ctx.memberships.find(
    (m) => m.tenantId === ctx.session.activeTenantId,
  );
  if (!active) redirect("/dashboard");

  const tenantId = active.tenantId;

  const activos = await modulosActivos(tenantId);
  if (!activos.has("REPORTES")) redirect("/dashboard");

  const params = await searchParams;
  const ahora = new Date();
  const periodoActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;
  const periodo =
    params.periodo && periodoBounds(params.periodo)
      ? params.periodo
      : periodoActual;
  const bounds = periodoBounds(periodo)!;

  const [ventas, compras, vendedores, centros, categorias] = await Promise.all([
    db.dteDocument.findMany({
      where: {
        tenantId,
        sentido: "SALIDA",
        estado: { in: ["ACEPTADO", "ANULADO"] },
        fechaEmision: { gte: bounds.gte, lt: bounds.lt },
      },
      select: { vendedorId: true, total: true },
    }),
    db.dteDocument.findMany({
      where: {
        tenantId,
        sentido: "ENTRADA",
        estado: { in: ["ACEPTADO", "ANULADO"] },
        fechaEmision: { gte: bounds.gte, lt: bounds.lt },
      },
      select: {
        costCenterId: true,
        emisorRut: true,
        emisorRazonSocial: true,
        total: true,
        items: { select: { total: true, categoryId: true } },
      },
    }),
    db.vendedor.findMany({
      where: { tenantId },
      select: { id: true, nombre: true },
    }),
    db.centroCosto.findMany({
      where: { tenantId },
      select: { id: true, codigo: true, nombre: true },
    }),
    db.categoria.findMany({
      where: { tenantId },
      select: { id: true, nombre: true },
    }),
  ]);

  const totalVentas = ventas.reduce((acc, d) => acc + d.total, 0);
  const totalCompras = compras.reduce((acc, d) => acc + d.total, 0);

  const porVendedor = resumenPorDimension(
    Object.values(
      ventas.reduce<Record<string, { id: string | null; docs: number; total: number }>>(
        (acc, d) => {
          const k = d.vendedorId ?? "null";
          acc[k] ??= { id: d.vendedorId, docs: 0, total: 0 };
          acc[k].docs += 1;
          acc[k].total += d.total;
          return acc;
        },
        {},
      ),
    ),
    new Map(vendedores.map((v) => [v.id, v.nombre])),
    "Sin vendedor",
  );

  const porArea = resumenPorDimension(
    Object.values(
      compras.reduce<Record<string, { id: string | null; docs: number; total: number }>>(
        (acc, d) => {
          const k = d.costCenterId ?? "null";
          acc[k] ??= { id: d.costCenterId, docs: 0, total: 0 };
          acc[k].docs += 1;
          acc[k].total += d.total;
          return acc;
        },
        {},
      ),
    ),
    new Map(centros.map((c) => [c.id, `${c.codigo} · ${c.nombre}`])),
    "Sin área",
  );

  const porCategoria = resumenPorDimension(
    Object.values(
      compras
        .flatMap((d) => d.items)
        .reduce<Record<string, { id: string | null; docs: number; total: number }>>(
          (acc, item) => {
            const k = item.categoryId ?? "null";
            acc[k] ??= { id: item.categoryId, docs: 0, total: 0 };
            acc[k].docs += 1;
            acc[k].total += item.total;
            return acc;
          },
          {},
        ),
    ),
    new Map(categorias.map((c) => [c.id, c.nombre])),
    "Sin categoría",
  );

  const proveedores = Object.values(
    compras.reduce<
      Record<string, { nombre: string; docs: number; total: number }>
    >((acc, d) => {
      const k = d.emisorRut ?? d.emisorRazonSocial ?? "desconocido";
      acc[k] ??= {
        nombre: d.emisorRazonSocial ?? d.emisorRut ?? "Proveedor sin datos",
        docs: 0,
        total: 0,
      };
      acc[k].docs += 1;
      acc[k].total += d.total;
      return acc;
    }, {}),
  )
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const periodos = [...new Set([periodo, ...ultimosPeriodos()])];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Reportes</h1>
          <p className="text-sm text-ink-soft">
            {active.tenant.name} · {etiquetaPeriodo(periodo)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="btn btn-ghost">
            ← Panel
          </Link>
        </div>
      </header>

      <form method="GET" className="flex items-center gap-2">
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="panel p-5 shadow-sm shadow-navy/10">
          <p className="text-xs text-ink-soft">Facturas de venta</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{ventas.length}</p>
        </div>
        <div className="panel p-5 shadow-sm shadow-navy/10">
          <p className="text-xs text-ink-soft">Total ventas</p>
          <p className="mt-1 text-2xl font-semibold text-ink">
            {clp.format(totalVentas)}
          </p>
        </div>
        <div className="panel p-5 shadow-sm shadow-navy/10">
          <p className="text-xs text-ink-soft">Facturas de compra</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{compras.length}</p>
        </div>
        <div className="panel p-5 shadow-sm shadow-navy/10">
          <p className="text-xs text-ink-soft">Total compras</p>
          <p className="mt-1 text-2xl font-semibold text-ink">
            {clp.format(totalCompras)}
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-ink">Ventas por vendedor</h2>
        {porVendedor.length === 0 ? (
          <p className="text-sm text-ink-soft">
            Sin ventas en {etiquetaPeriodo(periodo)}.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {porVendedor.map((r, i, filas) => (
              <li key={r.nombre} className="space-y-1.5 py-3">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium text-ink">{r.nombre}</span>
                  <span className="text-ink-soft">
                    {r.docs} docs · {clp.format(r.total)}
                  </span>
                </div>
                <Barra pct={(r.total / Math.max(filas[0].total, 1)) * 100} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-ink">Compras por área</h2>
        {porArea.length === 0 ? (
          <p className="text-sm text-ink-soft">
            Sin compras en {etiquetaPeriodo(periodo)}.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {porArea.map((r) => (
              <li key={r.nombre} className="space-y-1.5 py-3">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium text-ink">{r.nombre}</span>
                  <span className="text-ink-soft">
                    {r.docs} docs · {clp.format(r.total)}
                  </span>
                </div>
                <Barra pct={(r.total / Math.max(porArea[0].total, 1)) * 100} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-ink">Gasto por categoría</h2>
        {porCategoria.length === 0 ? (
          <p className="text-sm text-ink-soft">
            Sin compras en {etiquetaPeriodo(periodo)}.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {porCategoria.map((r) => (
              <li key={r.nombre} className="space-y-1.5 py-3">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium text-ink">{r.nombre}</span>
                  <span className="text-ink-soft">
                    {r.docs} ítems · {clp.format(r.total)}
                  </span>
                </div>
                <Barra pct={(r.total / Math.max(porCategoria[0].total, 1)) * 100} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-ink">Top proveedores</h2>
        {proveedores.length === 0 ? (
          <p className="text-sm text-ink-soft">
            Sin compras en {etiquetaPeriodo(periodo)}.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-line">
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">Proveedor</th>
                  <th scope="col" className="text-right">Docs</th>
                  <th scope="col" className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {proveedores.map((p) => (
                  <tr key={p.nombre}>
                    <td className="font-medium">{p.nombre}</td>
                    <td className="text-right text-ink-soft">{p.docs}</td>
                    <td className="text-right font-medium">
                      {clp.format(p.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
