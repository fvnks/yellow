import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { name, email, phone, personType, rut, message } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
    }

    // Dynamically import nodemailer to avoid bundling issues at build time
    const nodemailer = (await import("nodemailer")).default;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const html = `
      <h2>Nuevo mensaje de contacto</h2>
      <p><strong>Nombre:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Teléfono:</strong> ${phone || "—"}</p>
      <p><strong>Tipo:</strong> ${personType === "empresa" ? "Empresa" : "Persona natural"}</p>
      ${personType === "empresa" && rut ? `<p><strong>RUT:</strong> ${rut}</p>` : ""}
      <p><strong>Mensaje:</strong></p>
      <p>${message.replace(/\n/g, "<br>")}</p>
    `;

    await transporter.sendMail({
      from: `"Web Yellow" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: "alejandro@yellow-erp.cl, rodrigo@yellow-erp.cl",
      replyTo: email,
      subject: `Contacto web – ${name}`,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Contact API error:", err);
    return NextResponse.json({ error: "Error enviando correo" }, { status: 500 });
  }
}