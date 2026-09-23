import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Guardia de sesión de /dashboard. El chrome (header/main/footer) y el
 * contenedor lo aporta ya el root layout, así que este layout solo
 * valida la sesión y renderiza a sus hijos.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  return <>{children}</>;
}
