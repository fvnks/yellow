import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const ctx = await getAuthContext();
  redirect(ctx ? "/dashboard" : "/login");
}
