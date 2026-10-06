import type { Metadata } from "next";
import Link from "next/link";
import { getAuthContext } from "@/lib/session";

import { normalizarOferta } from "@/lib/oferta";
import { LandingHero } from "@/components/landing-hero";
import { LandingErpSecciones } from "@/components/landing-erp-secciones";
import { LandingSelector } from "@/components/landing-selector";
import { PillButton } from "@/components/pill-button";

export const dynamic = "force-dynamic";

/**
 * La variante de diseño no puede heredar el titulo de facturacion del layout:
 * si alguien llega por el selector, la pestaña tiene que decirle lo mismo que
 * la pagina. La variante ERP usa el titulo por defecto del layout.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ oferta?: string | string[] }>;
}): Promise<Metadata> {
  const params = await searchParams;
  if (normalizarOferta(params?.oferta) !== "diseno") return {};

  return {
    // El template del layout raíz no alcanza a la página del mismo segmento
    // (/), por eso el sufijo de marca va explícito.
    title: "Diseño web e identidad · Yellow",
    description:
      "Sitios, landings e identidad visual para negocios que necesitan verse tan bien como funcionan. Una conversación primero, sin plantillas.",
    openGraph: {
      title: "Diseño web e identidad · Yellow",
      description:
        "Sitios, landings e identidad visual para negocios que necesitan verse tan bien como funcionan. Una conversación primero, sin plantillas.",
      url: "https://yellow-erp.cl/diseno",
      siteName: "Yellow",
      locale: "es_CL",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Diseño web e identidad · Yellow",
      description:
        "Sitios, landings e identidad visual para negocios que necesitan verse tan bien como funcionan. Una conversación primero, sin plantillas.",
    },
  };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ oferta?: string | string[] }>;
}) {
  const [ctx, params] = await Promise.all([getAuthContext(), searchParams]);
  const oferta = normalizarOferta(params?.oferta);
  const esErp = oferta === "erp";

  return (
    <div className="pb-24">
      
      <LandingHero isAuthed={!!ctx} oferta={oferta} />

      {/* ═══ SECCIONES DEL PRODUCTO: solo si eligió facturación ═══ */}
      {esErp && <LandingErpSecciones />}
      {/* ═══ SELECTOR DE ATERRIZAJE: las dos puertas de Yellow ═══ */}
      <LandingSelector />

      {/* ═══ CTA: panel oscuro con peso visual ═══ */}
      <section id="contacto" className="pt-8">
        <div className="grain relative overflow-hidden rounded-2xl bg-ink px-8 py-16 text-center md:px-16 md:py-20">
          {/* Glow accent dentro del panel */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 h-64 w-[32rem] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -bottom-16 h-48 w-48 rounded-full bg-accent/8 blur-3xl"
          />

          <div className="relative">
            <p className="eyebrow mb-6 text-accent dark:text-accent-ink">
              {esErp ? "Modo simulado · sin certificado" : "Sin plantillas · sin compromiso"}
            </p>
            <h2 className="mx-auto max-w-xl text-3xl font-semibold tracking-tight text-bg md:text-4xl">
              {esErp ? "Empieza hoy, sin certificado" : "Hablemos de tu proyecto"}
            </h2>
            <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-bg/60">
              {esErp
                ? "Yellow funciona en modo simulado desde el primer minuto. Sube tu .p12 cuando estés listo y las mismas pantallas hablan con el SII real."
                : "Cuéntanos qué necesitas y te mostramos una propuesta antes de escribir una línea de código. Sin plantillas y sin compromiso."}
            </p>
            <div className="mt-8">
              {esErp ? (
                ctx ? (
                  <PillButton
                    href="/dashboard"
                    className="btn-accent min-h-11 px-8 py-3 text-base"
                    circleColor="#ffffff"
                    hoverTextColor="#09090b"
                  >
                    Ir al panel
                  </PillButton>
                ) : (
                  <PillButton
                    href="/register"
                    className="btn-accent min-h-11 px-8 py-3 text-base"
                    circleColor="#ffffff"
                    hoverTextColor="#09090b"
                  >
                    Crear cuenta
                  </PillButton>
                )
              ) : (
                <PillButton
                  href="/diseno#hablemos"
                  className="btn-accent min-h-11 px-8 py-3 text-base"
                  circleColor="#ffffff"
                  hoverTextColor="#09090b"
                >
                  Hablemos de tu proyecto
                </PillButton>
              )}
            </div>
            <p className="mt-6 text-sm text-bg/60">
              {esErp ? (
                <>
                  <Link
                    href="/contacto"
                    className="text-bg/60 underline underline-offset-4 hover:text-accent-text"
                  >
                    ¿Dudas? Escríbenos
                  </Link>
                  {" · "}
                  <Link
                    href="/diseno"
                    className="text-bg/60 underline underline-offset-4"
                  >
                    ¿Necesitas diseño web?
                  </Link>
                </>
              ) : (
                <Link
                  href="/"
                  className="text-bg/60 underline underline-offset-4"
                >
                  ¿Buscas facturación electrónica?
                </Link>
              )}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
