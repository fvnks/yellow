import type { Metadata } from "next";
import Link from "next/link";
import { SOPORTE_EMAIL } from "@/lib/contacto";

export const metadata: Metadata = {
  title: "Política de privacidad",
};

const SECCIONES: Array<{ titulo: string; parrafos: string[] }> = [
  {
    titulo: "Qué datos tratamos",
    parrafos: [
      "De tu cuenta: tu email, tu nombre y los espacios de trabajo que creas o a los que te invitan.",
      "De tu facturación: los documentos tributarios que emites y registras (receptores, proveedores, montos, estados) y sus descargas.",
      "De tu conexión con el SII: el certificado digital (.p12) y la clave tributaria que decidas subir, y los CAF que cargues.",
      "De sesión: una cookie con un token aleatorio; en la base de datos solo guardamos su hash SHA-256.",
    ],
  },
  {
    titulo: "Para qué los usamos",
    parrafos: [
      "Únicamente para prestarte el servicio: emitir y anular DTE, consultar estados, descargar tu registro del portal y armar tus libros. No vendemos ni cedemos tus datos con fines comerciales.",
    ],
  },
  {
    titulo: "Terceros",
    parrafos: [
      "El único receptor externo necesario es el propio SII: para emitir documentos, consultar su estado y descargar tu registro de compras y ventas. Nada más sale de la plataforma.",
    ],
  },
  {
    titulo: "Cómo protegemos los datos",
    parrafos: [
      "Las contraseñas se guardan con scrypt, nunca en texto plano. El certificado y la clave tributaria se cifran en reposo con AES-256-GCM y no se muestran de vuelta. Las sesiones se guardan solo como hash.",
      "Cada espacio de trabajo está aislado: un usuario de una empresa no puede ver los datos de otra.",
    ],
  },
  {
    titulo: "Cookies",
    parrafos: [
      "Solo la cookie de sesión. No usamos rastreadores, publicidad ni analítica de terceros.",
    ],
  },
  {
    titulo: "Tus derechos",
    parrafos: [
      "Puedes pedir acceso, rectificación o eliminación de tus datos en cualquier momento por el canal de contacto. Al eliminar un espacio de trabajo, sus documentos se eliminan con él.",
    ],
  },
];

export default function PrivacidadPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8 pb-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Política de privacidad
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
