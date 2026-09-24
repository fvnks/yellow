/**
 * Gasto agrupado por una dimensión comercial (centro de costo, categoría).
 * Función pura: recibe los grupos ya consultados (groupBy de Prisma) y los
 * mapea + ordena para la UI. Las FK usan onDelete: SetNull, así que un id
 * que falte en el mapa de nombres ya no es posible (queda como null).
 */
export type GrupoDimension = {
  /** Id de la dimensión; null = sin asignar (o FK puesta en null). */
  id: string | null;
  /** Conteo del groupBy (documentos o ítems, según la dimensión). */
  docs: number;
  total: number;
};

export type FilaResumen = { nombre: string; docs: number; total: number };

export function resumenPorDimension(
  grupos: GrupoDimension[],
  nombres: Map<string, string>,
  sinEtiqueta: string,
): FilaResumen[] {
  return grupos
    .map((g) => ({
      nombre: g.id ? (nombres.get(g.id) ?? sinEtiqueta) : sinEtiqueta,
      docs: g.docs,
      total: g.total,
    }))
    .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, "es"));
}
