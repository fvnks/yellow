/**
 * Oferta de la landing raiz.
 *
 * Yellow vende dos cosas distintas y la home tiene que preguntar cual de las
 * dos trae al visitante. La eleccion vive en la URL (?oferta=diseno) para que
 * el servidor renderice la variante completa: sin estado en cliente, sin
 * parpadeo de hidratacion y con un enlace directo que se puede compartir.
 */
export type Oferta = "erp" | "diseno";

export type OfertaInfo = {
  id: Oferta;
  /** Etiqueta del selector del hero. */
  label: string;
  /** Destino que deja esa oferta seleccionada. */
  href: string;
};

/** El orden importa: es el orden de las opciones en el selector. */
export const OFERTAS: readonly OfertaInfo[] = [
  { id: "erp", label: "Facturación electrónica", href: "/" },
  { id: "diseno", label: "Diseño web", href: "/?oferta=diseno" },
];

/** Landing larga de cada oferta. */
export const LANDING_DE: Record<Oferta, string> = {
  erp: "/?oferta=erp#funciones",
  diseno: "/diseno",
};

/**
 * `?oferta=` viene de la calle: cualquier valor ausente, repetido o inventado
 * cae en la oferta ERP, que es la que hoy sostiene el negocio.
 */
export function normalizarOferta(
  valor: string | string[] | undefined,
): Oferta {
  const primero = Array.isArray(valor) ? valor[0] : valor;
  return primero === "diseno" ? "diseno" : "erp";
}
