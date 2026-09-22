import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/session";
import { LogoutButton } from "@/components/logout-button";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          <span className="font-semibold">yellow</span> · {ctx.user.email}
        </p>
        <LogoutButton />
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-6 py-10">
        {children}
      </main>
    </div>
  );
}
