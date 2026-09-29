"use client";

import { useState } from "react";
import { PillSubmitButton } from "@/components/pill-submit-button";

type FormStatus = "idle" | "loading" | "success" | "error";
type PersonType = "persona" | "empresa";

export function ContactForm() {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    personType: "persona" as PersonType,
    rut: "",
    message: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setStatus("success");
        setFormData({ name: "", email: "", phone: "", personType: "persona", rut: "", message: "" });
      } else setStatus("error");
    } catch { setStatus("error"); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-muted mb-1">Nombre</label>
          <input id="name" name="name" type="text" required value={formData.name} onChange={handleChange} disabled={status==="loading"} className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors" placeholder="Tu nombre" />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-muted mb-1">Correo electrónico</label>
          <input id="email" name="email" type="email" required value={formData.email} onChange={handleChange} disabled={status==="loading"} className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors" placeholder="tu@correo.cl" />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-muted mb-1">Teléfono</label>
          <input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} disabled={status==="loading"} className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors" placeholder="+56 9 1234 5678" />
        </div>
        <div>
          <label htmlFor="personType" className="block text-sm font-medium text-muted mb-1">Tipo</label>
          <select id="personType" name="personType" value={formData.personType} onChange={handleChange} disabled={status==="loading"} className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors">
            <option value="persona">Persona natural</option>
            <option value="empresa">Empresa</option>
          </select>
        </div>
      </div>

      {formData.personType==="empresa" && (
        <div>
          <label htmlFor="rut" className="block text-sm font-medium text-muted mb-1">RUT empresa</label>
          <input id="rut" name="rut" type="text" value={formData.rut} onChange={handleChange} disabled={status==="loading"} className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors" placeholder="76.123.456-7" />
        </div>
      )}

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-muted mb-1">Mensaje</label>
        <textarea id="message" name="message" required rows={5} value={formData.message} onChange={handleChange} disabled={status==="loading"} className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors resize-y" placeholder="Cuéntanos qué necesitas..." />
      </div>

      <PillSubmitButton disabled={status==="loading"} className="btn-primary min-h-11 px-8 py-3 text-base w-full md:w-auto" circleColor="#ffffff" hoverTextColor="#09090b">
        {status==="loading" ? "Enviando…" : "Enviar mensaje"}
      </PillSubmitButton>

      {status==="success" && <p className="text-sm text-green" role="status">✅ Mensaje enviado. Te responderemos a la brevedad.</p>}
      {status==="error" && <p className="text-sm text-err" role="alert">❌ No pudimos enviar el mensaje. Inténtalo de nuevo o escríbenos directo a hola@yellow-erp.cl</p>}
    </form>
  );
}