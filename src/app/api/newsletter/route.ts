import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Email inválido"),
  source: z.string().optional().default("footer"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, source } = parsed.data;

    // Check if already exists
    const existing = await db.newsletter.findUnique({ where: { email } });
    if (existing) {
      if (!existing.confirmed) {
        // Re-send confirmation if not confirmed
        // TODO: send confirmation email
      }
      return NextResponse.json(
        { message: "Este email ya está suscrito" },
        { status: 409 }
      );
    }

    await db.newsletter.create({
      data: { email, source },
    });

    // TODO: send confirmation email via nodemailer
    // await sendConfirmationEmail(email);

    return NextResponse.json({ message: "Suscripción exitosa" });
  } catch (err) {
    console.error("Newsletter API error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}