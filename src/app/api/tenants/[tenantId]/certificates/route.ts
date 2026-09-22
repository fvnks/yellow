import { NextResponse } from "next/server";
import { canManageTenant, findMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { normalizeRut, formatRut } from "@/lib/rut";
import { getAuthContext } from "@/lib/session";
import { Pkcs12Error, loadPkcs12, type LoadedCertificate } from "@/lib/sii/pkcs12";
import { issuesOf, uploadCertificateSchema } from "@/lib/validation";
import { encryptSecret } from "@/lib/crypto";

const certSelect = {
  id: true,
  nombre: true,
  subject: true,
  rut: true,
  issuer: true,
  serialNumber: true,
  notBefore: true,
  notAfter: true,
  active: true,
  createdAt: true,
} as const;

function shape(cert: {
  id: string;
  nombre: string;
  subject: string | null;
  rut: string | null;
  issuer: string | null;
  serialNumber: string | null;
  notBefore: Date | null;
  notAfter: Date | null;
  active: boolean;
  createdAt: Date;
}) {
  return {
    ...cert,
    notBefore: cert.notBefore?.toISOString() ?? null,
    notAfter: cert.notAfter?.toISOString() ?? null,
    createdAt: cert.createdAt.toISOString(),
  };
}

/**
 * GET — list the tenant's SII certificates (metadata only; the .p12 blob
 * and password are encrypted and never returned). OWNER/ADMIN only.
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

  const certificates = await db.siiCertificate.findMany({
    where: { tenantId },
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    select: certSelect,
  });
  return NextResponse.json({ certificates: certificates.map(shape) });
}

/**
 * POST — upload a .p12/.pfx certificate. The file is opened with the
 * provided password, its metadata extracted, RUT/validity checked against
 * the emisor profile, and both blob and password stored AES-256-GCM
 * encrypted. Becomes the tenant's active certificate (real SII mode).
 * OWNER/ADMIN only.
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
    const parsed = uploadCertificateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: issuesOf(parsed.error) },
        { status: 400 },
      );
    }
    const { nombre, p12Base64, password } = parsed.data;

    const p12 = Buffer.from(p12Base64, "base64");
    if (p12.length === 0) {
      return NextResponse.json(
        { error: "El archivo .p12 está vacío o el base64 es inválido" },
        { status: 400 },
      );
    }

    let cert: LoadedCertificate;
    try {
      cert = loadPkcs12(p12, password);
    } catch (err) {
      const message =
        err instanceof Pkcs12Error
          ? err.message
          : "No se pudo leer el archivo .p12";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const now = Date.now();
    if (cert.notAfter.getTime() < now) {
      return NextResponse.json(
        {
          error: `El certificado está vencido (venció el ${cert.notAfter.toLocaleDateString("es-CL")})`,
        },
        { status: 422 },
      );
    }
    if (cert.notBefore.getTime() > now) {
      return NextResponse.json(
        {
          error: `El certificado aún no es válido (vigente desde el ${cert.notBefore.toLocaleDateString("es-CL")})`,
        },
        { status: 422 },
      );
    }

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { rut: true },
    });
    if (tenant?.rut && cert.rut && cert.rut !== normalizeRut(tenant.rut)) {
      return NextResponse.json(
        {
          error: `El certificado es del RUT ${formatRut(cert.rut)} pero el emisor de este tenant es ${formatRut(tenant.rut)}`,
        },
        { status: 409 },
      );
    }

    const p12Encrypted = encryptSecret(p12Base64);
    const passwordEncrypted = encryptSecret(password);

    const [, created] = await db.$transaction([
      db.siiCertificate.updateMany({
        where: { tenantId },
        data: { active: false },
      }),
      db.siiCertificate.create({
        data: {
          tenantId,
          nombre: nombre ?? "Certificado emisor",
          p12Encrypted,
          passwordEncrypted,
          subject: cert.subject,
          rut: cert.rut,
          issuer: cert.issuer,
          serialNumber: cert.serialNumber,
          notBefore: cert.notBefore,
          notAfter: cert.notAfter,
          active: true,
        },
        select: certSelect,
      }),
    ]);

    return NextResponse.json({ certificate: shape(created) }, { status: 201 });
  } catch (err) {
    console.error("[certificates:POST] unexpected error", err);
    return NextResponse.json(
      { error: "Error interno. Intenta nuevamente." },
      { status: 500 },
    );
  }
}
