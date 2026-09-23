"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export type Certificado = {
  id: string;
  nombre: string;
  subject: string | null;
  rut: string | null;
  notBefore: string | null;
  notAfter: string | null;
  active: boolean;
};

/** Human-readable validity + whether the certificate expired or expires soon (≤30 d). */
function vigencia(cert: Certificado): {
  texto: string;
  vencido: boolean;
  porVencer: boolean;
} {
  if (!cert.notAfter) {
    return { texto: "vigencia desconocida", vencido: false, porVencer: false };
  }
  const hasta = new Date(cert.notAfter);
  const dias = Math.ceil((hasta.getTime() - Date.now()) / 86_400_000);
  const vencido = dias < 0;
  const porVencer = !vencido && dias <= 30;
  return {
    texto: vencido
      ? `vencido el ${hasta.toLocaleDateString("es-CL")}`
      : porVencer
        ? `vence el ${hasta.toLocaleDateString("es-CL")} (en ${dias} días)`
        : `hasta ${hasta.toLocaleDateString("es-CL")}`,
    vencido,
    porVencer,
  };
}

/**
 * Upload/manage the tenant's SII .p12 certificate. The active certificate
 * switches emission from mock mode to the real SII (certificación or
 * producción depending on SII_ENV).
 */
export function CertificadosPanel({
  tenantId,
  certificates,
}: {
  tenantId: string;
  certificates: Certificado[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!file) {
      setError("Selecciona el archivo .p12/.pfx");
      return;
    }
    setBusy(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      const res = await fetch(`/api/tenants/${tenantId}/certificates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim() || undefined,
          p12Base64: btoa(binary),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo subir el certificado");
        return;
      }
      setFile(null);
      setPassword("");
      setNombre("");
      if (fileRef.current) fileRef.current.value = "";
      setNotice(
        `Certificado "${data.certificate.nombre}" cargado. La emisión usa el SII real.`,
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function eliminar(cert: Certificado) {
    const extra = cert.active
      ? " Era el certificado activo: la emisión vuelve al modo simulado."
      : "";
    if (!window.confirm(`¿Eliminar el certificado "${cert.nombre}"?${extra}`)) return;
    setError(null);
    setNotice(null);
    setBusyId(cert.id);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/certificates/${cert.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo eliminar el certificado");
        return;
      }
      setNotice("Certificado eliminado.");
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-ink">
        Certificado digital (firma del SII)
      </h2>

      {error && <p className="alert alert-error">{error}</p>}
      {notice && <p className="alert alert-ok">{notice}</p>}

      {certificates.length > 0 ? (
        <ul className="space-y-2">
          {certificates.map((cert) => {
            const v = vigencia(cert);
            return (
              <li
                key={cert.id}
                className="panel flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <span className="min-w-0 space-y-0.5">
                  <span className="block truncate font-medium text-ink">
                    {cert.nombre}
                    {cert.active && (
                      <span className="chip chip-ok ml-2">activo</span>
                    )}
                  </span>
                  <span className="block truncate text-xs text-ink-soft">
                    {cert.subject ?? "Sin subject"} ·{" "}
                    <span
                      className={
                        v.vencido
                          ? "font-medium text-err"
                          : v.porVencer
                            ? "font-medium text-orange-ink"
                            : undefined
                      }
                    >
                      vigencia {v.texto}
                    </span>
                    {cert.rut ? ` · RUT ${cert.rut}` : ""}
                  </span>
                </span>
                <button
                  onClick={() => eliminar(cert)}
                  disabled={busyId === cert.id}
                  className="btn btn-danger"
                >
                  {busyId === cert.id ? "Eliminando…" : "Eliminar"}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-ink-soft">
          Sin certificado. Sube el <code>.p12</code> emitido por el SII para tu RUT
          y la pasarela real quedará activa.
        </p>
      )}

      <form onSubmit={upload} className="space-y-2">
        <input
          ref={fileRef}
          type="file"
          accept=".p12,.pfx,application/x-pkcs12"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm text-ink-soft file:mr-3 file:rounded-md file:border-0 file:bg-navy file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-navy-hover"
        />
        <div className="flex flex-wrap gap-2">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña del .p12"
            autoComplete="new-password"
            className="field w-auto"
          />
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre (opcional)"
            className="field w-auto min-w-40"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !file || !password}
          className="btn btn-primary"
        >
          {busy ? "Validando…" : "Subir certificado"}
        </button>
      </form>

      <p className="text-xs text-ink-soft">
        La contraseña y el archivo se guardan cifrados (AES-256-GCM) y solo se
        usan para firmar y autenticarnos ante el SII. Nunca se devuelven por la API.
      </p>
    </section>
  );
}
