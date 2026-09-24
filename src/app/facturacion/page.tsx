import { redirect } from "next/navigation";

/**
 * El módulo Facturación se consolidó en ERP; la ruta vieja redirige para
 * no romper enlaces existentes.
 */
export default function FacturacionPage() {
  redirect("/erp?sentido=SALIDA");
}
