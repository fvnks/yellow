import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { modulosActivos } from "@/lib/modules";
import { getAuthContext } from "@/lib/session";

export const dynamic = "force-dynamic";

const clp = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const iso = (d: Date | null) =>
  d ? d.toISOString().slice(0, 10) : "—";

type FilaDirectorio = {
  rut: string;
  nombre: string | null;
  docs: number;
  total: number;
  ultima: string;
};

/**
 * Directorio del ERP: clientes (agrupados por receptor en ventas) y
 * proveedores (agrupados por emisor en compras), con su historial de
 * documentos y totales. Derivado por completo de los DTE existentes.
 */
export default async function DirectorioPage({
  searchParams,
}: {
  searchParams: Promise<{ lado?: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const active = ctx.memberships.find(
    (m) => m.tenantId === ctx.session.activeTenantId,
  );
  if (!active) redirect("/dashboard");

  const tenantId = active.tenantId;
  const activos = await modulosActivos(tenantId);
  if (!activos.has("ERP")) redirect("/dashboard");

  const params = await searchParams;
  const lado = params.lado === "proveedores" ? "proveedores" : "clientes";

  const [clientesRaw, proveedoresRaw] = await Promise.all([
    db.dteDocument.groupBy({
      by: ["receptorRut", "receptorRazonSocial"],
      where: { tenantId, sentido: "SALIDA", receptorRut: { not: null } },
      _sum: { total: true },
      _count: { _all: true },
      _max: { fechaEmision: true },
    }),
    db.dteDocument.groupBy({
      by: ["emisorRut", "emisorRazonSocial"],
      where: { tenantId, sentido: "ENTRADA", emisorRut: { not: null } },
      _sum: { total: true },
      _count: { _all: true },
      _max: { fechaEmision: true },
    }),
  ]);

  const clientes: FilaDirectorio[] = clientesRaw
    .map((c) => ({
      rut: c.receptorRut ?? "",
      nombre: c.receptorRazonSocial,
      docs: c._count._all,
      total: c._sum.total ?? 0,
      ultima: iso(c._max.fechaEmision),
    }))
    .sort((a, b) => b.total - a.total);

  const proveedores: FilaDirectorio[] = proveedoresRaw
    .map((p) => ({
      rut: p.emisorRut ?? "",
      nombre: p.emisorRazonSocial,
      docs: p._count._all,
      total: p._sum.total ?? 0,
      ultima: iso(p._max.fechaEmision),
    }))
    .sort((a, b) => b.total - a.total);

  const filas = lado === "proveedores" ? proveedores : clientes;
  const href = (l: string) => `/erp/directorio?lado=${l}`;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Directorio</h1>
          <p className="text-sm text-ink-soft">
            {active.tenant.name} · tu red comercial, derivada de los
            documentos registrados
          </p>
        </div>
      </header>

      <div className="flex gap-2">
        <Link
          href={href("clientes")}
          className={lado === "clientes" ? "btn btn-primary" : "btn btn-ghost"}
        >
          Clientes
        </Link>
        <Link
          href={href("proveedores")}
          className={
            lado === "proveedores" ? "btn btn-primary" : "btn btn-ghost"
          }
        >
          Proveedores
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-ink">
          {lado === "clientes" ? "Clientes" : "Proveedores"} ({filas.length})
        </h2>
        {filas.length === 0 ? (
          <p className="text-sm text-ink-soft">
            {lado === "clientes"
              ? "Todavía no hay ventas registradas; tus clientes aparecerán acá."
              : "Todavía no hay compras registradas; tus proveedores aparecerán acá."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-line">
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">RUT</th>
                  <th scope="col">
                    {lado === "clientes" ? "Razón social" : "Proveedor"}
                  </th>
                  <th scope="col" className="text-right">Docs</th>
                  <th scope="col" className="text-right">
                    {lado === "clientes" ? "Total facturado" : "Total comprado"}
                  </th>
                  <th scope="col">Último documento</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => (
                  <tr key={fila.rut}>
                    <td className="whitespace-nowrap font-medium">{fila.rut}</td>
                    <td>{fila.nombre ?? "—"}</td>
                    <td className="text-right text-ink-soft">{fila.docs}</td>
                    <td className="text-right font-medium">
                      {clp.format(fila.total)}
                    </td>
                    <td className="whitespace-nowrap text-ink-soft">
                      {fila.ultima}
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
