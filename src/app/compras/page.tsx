import { redirect } from "next/navigation";

/**
 * El módulo Compras se consolidó en ERP; la ruta vieja redirige para no
 * romper enlaces existentes.
 */
export default function ComprasPage() {
  redirect("/erp?sentido=ENTRADA");
}
