import { NextResponse } from "next/server";
import { canManageTenant, findMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { CafParseError, parseCaf } from "@/lib/dte/caf";
import { getAuthContext } from "@/lib/session";
import { normalizeRut } from "@/lib/rut";
import { issuesOf, uploadCafSchema } from "@/lib/validation";

const cafSelect = {
  id: true,
  tipoDte: true,
  folioDesde: true,
  folioHasta: true,
  nextFolio: true,
  active: true,
  createdAt: true,
} as const;

/**
 * GET — list the tenant's CAFs (metadata only; the XML carries the
 * private RSASK key and is never returned). OWNER/ADMIN only.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { tenantId } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!findMembership(ctx, tenantId)) {
    return NextResponse.json({ error: "No eres miembro de este tenant" }, { status: 403 });
  }
  if (!canManageTenant(ctx, tenantId)) {
    return NextResponse.json(
      { error: "Se requiere rol OWNER o ADMIN" },
      { status: 403 },
    );
  }

  const cafs = await db.caf.findMany({
    where: { tenantId },
    orderBy: [{ tipoDte: "asc" }, { folioDesde: "asc" }],
    select: cafSelect,
  });
  return NextResponse.json({ cafs });
}

/**
 * POST — upload a CAF XML downloaded from the SII. The file is parsed
 * and validated before storage; its RUT must match the tenant's emisor
 * RUT. OWNER/ADMIN only.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const { tenantId } = await params;
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    if (!findMembership(ctx, tenantId)) {
      return NextResponse.json({ error: "No eres miembro de este tenant" }, { status: 403 });
    }
    if (!canManageTenant(ctx, tenantId)) {
      return NextResponse.json(
        { error: "Se requiere rol OWNER o ADMIN" },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = uploadCafSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: issuesOf(parsed.error) },
        { status: 400 },
      );
    }

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { rut: true },
    });
    if (!tenant?.rut) {
      return NextResponse.json(
        { error: "Primero configura el RUT del emisor en el perfil" },
        { status: 422 },
      );
    }

    let caf;
    try {
      caf = parseCaf(parsed.data.xml);
    } catch (err) {
      if (err instanceof CafParseError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }

    if (caf.rutEmisor !== normalizeRut(tenant.rut)) {
      return NextResponse.json(
        { error: "El RUT del CAF no coincide con el RUT del emisor" },
        { status: 409 },
      );
    }

    const existing = await db.caf.findMany({
      where: { tenantId, tipoDte: caf.tipoDte, active: true },
      select: { folioDesde: true, folioHasta: true },
    });
    const overlaps = existing.some(
      (c) => c.folioDesde <= caf.folioHasta && caf.folioDesde <= c.folioHasta,
    );
    if (overlaps) {
      return NextResponse.json(
        { error: "Ya existe un CAF activo con folios que se solapan para este tipo" },
        { status: 409 },
      );
    }

    const created = await db.caf.create({
      data: {
        tenantId,
        tipoDte: caf.tipoDte,
        folioDesde: caf.folioDesde,
        folioHasta: caf.folioHasta,
        nextFolio: caf.folioDesde,
        xml: parsed.data.xml,
      },
      select: cafSelect,
    });

    return NextResponse.json({ caf: created }, { status: 201 });
  } catch (err) {
    console.error("[cafs:POST] unexpected error", err);
    return NextResponse.json(
      { error: "Error interno. Intenta nuevamente." },
      { status: 500 },
    );
  }
}
