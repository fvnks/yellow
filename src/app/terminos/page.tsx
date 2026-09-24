import type { Metadata } from "next";
import Link from "next/link";
import { SOPORTE_EMAIL } from "@/lib/contacto";

export const metadata: Metadata = {
  title: "Términos del servicio",
};

const SECCIONES: Array<{ titulo: string; parrafos: string[] }> = [
  {
    titulo: "1. El servicio",
    parrafos: [
      "Yellow es una plataforma de facturación electrónica que permite emitir, anular y registrar documentos tributarios electrónicos (DTE) ante el Servicio de Impuestos Internos (SII) de Chile, llevar los libros de compras y ventas, y administrar varias empresas con roles por usuario.",
    ],
  },
  {
    titulo: "2. Tu cuenta",
    parrafos: [
      "Te registras con un email y una contraseña. Eres responsable de mantenerlos seguros: quien entre con tu cuenta actúa en tu nombre.",
      "Cada empresa vive en su propio espacio de trabajo, aislado del resto. Puedes invitar a tu equipo con roles de administrador o miembro.",
    ],
  },
  {
    titulo: "3. Modo simulado y modo producción",
    parrafos: [
      "Sin certificado digital, la plataforma opera en modo simulado: los documentos que emites o anulas no son válidos ante el SII. Al subir tu certificado (.p12), las mismas operaciones pasan a producción con llamadas reales al SII.",
      "En producción, es tu responsabilidad revisar cada documento antes de enviarlo: los folios consumidos de tus CAF no se recuperan.",
    ],
  },
  {
    titulo: "4. Certificados y credenciales",
    parrafos: [
      "Tu certificado .p12 y tu clave tributaria se almacenan cifrados en reposo (AES-256-GCM) y nunca se muestran de vuelta. Tú decides subirlos y puedes eliminarlos cuando quieras.",
      "El uso de tu certificado y de tus CAF se rige por la normativa del SII vigente; Yellow es una herramienta de emisión y registro, no un reemplazo de tus obligaciones tributarias.",
    ],
  },
  {
    titulo: "5. Uso aceptable",
    parrafos: [
      "No uses el servicio para actividades ilegales, para emitir documentos con datos falsos ni para fines distintos a tu facturación. Podemos suspender cuentas que incumplan esta regla.",
    ],
  },
  {
    titulo: "6. Tus datos y documentos",
    parrafos: [
      "Los documentos que emites y registras son tuyos. Puedes exportarlos cuando quieras: el XML y el PDF de cada documento, y el registro en CSV.",
    ],
  },
  {
    titulo: "7. Disponibilidad",
    parrafos: [
      "El servicio se entrega tal cual, sin garantía de disponibilidad ininterrumpida. Las mantenciones se comunican con anticipencia cuando sea posible.",
    ],
  },
  {
    titulo: "8. Cambios y contacto",
    parrafos: [
      "Podemos actualizar estos términos; la fecha de la versión vigente se indica al inicio. Si tienes dudas, escríbenos por el canal de contacto de la página principal.",
    ],
  },
  {
    titulo: "9. Ley aplicable",
    parrafos: [
      "Estos términos se rigen por la ley chilena; cualquier controversia se somete a los tribunales de Santiago.",
    ],
  },
];

export default function TerminosPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8 pb-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Términos del servicio
        </h1>
        <p className="text-sm text-ink-soft">
          Última actualización: 23 de septiembre de 2026
        </p>
      </header>

      <div className="space-y-6 text-sm leading-relaxed text-ink">
        {SECCIONES.map((s) => (
          <section key={s.titulo} className="space-y-1.5">
            <h2 className="text-base font-semibold text-ink">{s.titulo}</h2>
            {s.parrafos.map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
          </section>
        ))}
      </div>

      <p className="border-t border-line pt-4 text-xs text-ink-soft">
        {SOPORTE_EMAIL ? (
          <>
            Contacto:{" "}
            <a
              href={`mailto:${SOPORTE_EMAIL}`}
              className="underline hover:text-orange-ink"
            >
              {SOPORTE_EMAIL}
            </a>
          </>
        ) : (
          <>
            Contacto: a través de la{" "}
            <Link href="/#contacto" className="underline hover:text-orange-ink">
              sección de contacto
            </Link>{" "}
            de la página principal.
          </>
        )}
      </p>
    </article>
  );
}
