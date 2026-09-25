import Link from "next/link";

const FILAS_PREVIEW = [
  {
    doc: "Factura 33 · 1000",
    parte: "Cliente SpA",
    total: "$119.000",
    estado: "ACEPTADO",
    chip: "chip chip-ok",
  },
  {
    doc: "Guía 52 · 3",
    parte: "Cliente SpA",
    total: "$47.600",
    estado: "ENVIADO",
    chip: "chip chip-orange",
  },
  {
    doc: "Factura 33 · 1001",
    parte: "Cliente SpA",
    total: "$95.200",
    estado: "ANULADO",
    chip: "chip chip-muted",
  },
  {
    doc: "N. crédito 61 · 4",
    parte: "Cliente SpA",
    total: "$119.000",
    estado: "ACEPTADO",
    chip: "chip chip-ok",
  },
];

/**
 * Hero oscuro estilo SaaSly: gradiente navy, texto blanco centrado,
 * badge arriba, CTAs contrastantes, y un preview del producto BLANCO
 * que resalta con tarjetas flotantes de glass-morphism.
 */
export function LandingHero({ isAuthed }: { isAuthed: boolean }) {
  return (
    <section className="relative overflow-hidden rounded-xl bg-gradient-to-b from-navy to-navy-hover px-6 py-16 text-center md:px-12 md:py-24">
      {/* Glow terracotta centrado */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[28rem] w-[36rem] -translate-x-1/2 rounded-full bg-orange/15 blur-3xl"
      />
      {/* Glow sutil lateral */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 top-1/3 h-64 w-64 rounded-full bg-blue-bright/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 bottom-1/4 h-64 w-64 rounded-full bg-orange/10 blur-3xl"
      />

      {/* Badge */}
      <div className="relative mb-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-orange" aria-hidden />
          Facturación electrónica · SII Chile
        </span>
      </div>

      {/* Título */}
      <h1 className="relative mx-auto mb-5 max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight text-white md:text-6xl">
        Todo el ciclo de tus DTE,{" "}
        <span className="text-orange">en un solo lugar</span>
      </h1>

      {/* Descripción */}
      <p className="relative mx-auto mb-10 max-w-[55ch] text-base leading-relaxed text-white/70 md:text-lg">
        Emite facturas, registra compras, controla gastos, cotiza y descarga
        tus libros. Del borrador al TED, sin pelear con el SII.
      </p>

      {/* CTAs */}
      <div className="relative mb-16 flex flex-wrap items-center justify-center gap-4">
        {isAuthed ? (
          <Link
            href="/dashboard"
            className="btn bg-white px-6 py-3 text-base text-navy transition-colors hover:bg-orange hover:text-white active:translate-y-px"
          >
            Ir al panel
          </Link>
        ) : (
          <>
            <Link
              href="/register"
              className="btn bg-white px-6 py-3 text-base text-navy transition-colors hover:bg-orange hover:text-white active:translate-y-px"
            >
              Crear cuenta
            </Link>
            <Link
              href="/login"
              className="btn border-white/30 bg-white/5 px-6 py-3 text-base text-white transition-colors hover:border-white/50 hover:bg-white/10 active:translate-y-px"
            >
              Ingresar
            </Link>
          </>
        )}
      </div>

      {/* Preview del producto con tarjetas flotantes */}
      <div className="relative mx-auto max-w-5xl">
        {/* Tarjeta flotante: monto */}
        <div
          className="absolute -top-4 right-4 z-10 hidden rounded-lg border border-white/20 bg-navy/80 px-4 py-3 shadow-xl backdrop-blur-md md:block"
        >
          <p className="text-xs text-white/50">Facturas emitidas</p>
          <p className="font-mono text-lg font-bold text-white">$119.000</p>
        </div>

        {/* Tarjeta flotante: estado */}
        <div
          className="absolute -bottom-4 left-6 z-10 hidden rounded-lg border border-white/20 bg-navy/80 px-4 py-3 shadow-xl backdrop-blur-md md:block"
        >
          <p className="flex items-center gap-2 text-sm text-white/50">
            <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
            Aceptado por el SII
          </p>
          <p className="text-xs text-white/40">Track: 12345678</p>
        </div>

        {/* Panel blanco con la tabla (contraste contra el fondo oscuro) */}
        <div className="relative overflow-hidden rounded-xl bg-white shadow-2xl shadow-black/40">
          <div className="flex items-center justify-between border-b border-[#e5e8e3] bg-[#eef1ee] px-4 py-3">
            <span className="text-sm font-medium text-[#5c646c]">
              Ventas · septiembre 2026
            </span>
            <span className="text-sm text-[#5c646c]">
              XML · PDF por fila
            </span>
          </div>
          <div className="overflow-x-auto">
            <table
              className="w-full border-collapse text-[13px]"
              style={{ color: "#16202e" }}
            >
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="border-b border-[#e5e8e3] bg-[#eef1ee] px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-[#5c646c]"
                  >
                    Documento
                  </th>
                  <th
                    scope="col"
                    className="border-b border-[#e5e8e3] bg-[#eef1ee] px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-[#5c646c]"
                  >
                    Receptor
                  </th>
                  <th
                    scope="col"
                    className="border-b border-[#e5e8e3] bg-[#eef1ee] px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-[#5c646c]"
                  >
                    Total
                  </th>
                  <th
                    scope="col"
                    className="border-b border-[#e5e8e3] bg-[#eef1ee] px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-[#5c646c]"
                  >
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {FILAS_PREVIEW.map((f) => (
                  <tr
                    key={f.doc}
                    className="border-b border-[#e5e8e3] transition-colors last:border-b-0 hover:bg-[#f7f8f6]"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-semibold">
                      {f.doc}
                    </td>
                    <td className="px-4 py-3 text-[#5c646c]">{f.parte}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      {f.total}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={f.chip}>{f.estado}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
