import Link from "next/link";

export const metadata = {
  title: "Página no encontrada",
};

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 text-center">
      <p className="text-5xl font-semibold text-navy">404</p>
      <h1 className="text-xl font-semibold text-ink">
        No encontramos esa página
      </h1>
      <p className="text-sm text-ink-soft">
        El enlace puede estar roto, o el documento ya no existe en este espacio
        de trabajo.
      </p>
      <Link href="/" className="btn btn-primary">
        Volver al inicio
      </Link>
    </div>
  );
}
