import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { getAuthContext } from "@/lib/session";
import { siiAmbiente } from "@/lib/sii/client";

/**
 * Chrome superior al estilo sii.cl: franja navy con la sesión y el
 * ambiente del SII, más la barra con la marca sobre fondo claro.
 * Sin sesión (login/registro) solo se muestra la marca e "Ingresar".
 */
export async function AppHeader() {
  const ctx = await getAuthContext();
  const ambiente = siiAmbiente();

  return (
    <header className="border-b border-line bg-panel">
      {ctx && (
        <div className="bg-navy text-white">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-6 py-2 text-xs">
            <span className="truncate text-white/85">{ctx.user.email}</span>
            <span className="flex items-center gap-3">
              <span className="rounded-full border border-white/40 px-2 py-0.5 text-white/90">
                SII {ambiente === "produccion" ? "producción" : "certificación"}
              </span>
              <LogoutButton />
            </span>
          </div>
        </div>
      )}
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span aria-hidden className="h-3.5 w-3.5 bg-orange" />
          <span className="text-lg font-semibold tracking-tight text-ink">
            Yellow
          </span>
        </Link>
        {!ctx && (
          <Link href="/login" className="btn btn-primary">
            Ingresar
          </Link>
        )}
      </div>
    </header>
  );
}
