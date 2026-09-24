import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MODULOS_CORE } from "@/lib/modules";
import { getAuthContext } from "@/lib/session";
import { uniqueSlug } from "@/lib/slug";
import { createTenantSchema, issuesOf } from "@/lib/validation";

/** POST — create a new tenant; the current user becomes its OWNER. */
export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const parsed = createTenantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: issuesOf(parsed.error) },
        { status: 400 },
      );
    }

    const tenant = await db.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: parsed.data.name, slug: uniqueSlug(parsed.data.name) },
      });
      await tx.tenantMember.create({
        data: { userId: ctx.user.id, tenantId: tenant.id, role: "OWNER" },
      });
      // Los módulos core quedan activos desde el primer día.
      await tx.tenantModule.createMany({
        data: MODULOS_CORE.map((key) => ({ tenantId: tenant.id, key })),
      });
      // Switch the session to the newly created tenant.
      await tx.session.update({
        where: { id: ctx.session.id },
        data: { activeTenantId: tenant.id },
      });
      return tenant;
    });

    return NextResponse.json(
      { tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug } },
      { status: 201 },
    );
  } catch (err) {
    console.error("[tenants:POST] unexpected error", err);
    return NextResponse.json(
      { error: "Error interno. Intenta nuevamente." },
      { status: 500 },
    );
  }
}
