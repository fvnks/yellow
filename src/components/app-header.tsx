import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { getAuthContext } from "@/lib/session";
import { siiAmbiente } from "@/lib/sii/client";

/**
 * Cabecera Yellow: minimal, dark strip cuando hay sesión, marca limpia.
 */
export async function AppHeader() {
  const ctx = await getAuthContext();
  const ambiente = siiAmbiente();

  return (
    <header className="border-b border-border bg-surface">
      {ctx && (
        <div className="bg-ink text-bg">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-6 py-1.5 text-xs">
            <span className="truncate text-bg/70">{ctx.user.email}</span>
            <span className="flex items-center gap-3">
              <span className="rounded-full border border-bg/20 px-2 py-0.5 text-bg/80">
                SII {ambiente === "produccion" ? "producción" : "certificación"}
              </span>
              <LogoutButton />
            </span>
          </div>
        </div>
      )}
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-4 w-4 rounded-[5px] bg-accent"
          />
          <span className="text-lg font-bold tracking-tight text-ink">
            Yellow
          </span>
        </Link>
        <span className="flex items-center gap-2">
          <ThemeToggle />
          {!ctx && (
            <>
              <Link href="/login" className="btn btn-ghost">
                Ingresar
              </Link>
              <Link href="/register" className="btn btn-primary">
                Crear cuenta
              </Link>
            </>
          )}
        </span>
      </div>
    </header>
  );
}
