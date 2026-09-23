"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-xl font-semibold text-ink">Algo salió mal</h1>
      <p className="text-sm text-ink-soft" role="alert">
        No pudimos procesar la solicitud. Puedes intentar nuevamente; si el
        problema continúa, vuelve más tarde.
      </p>
      <button type="button" onClick={reset} className="btn btn-primary">
        Reintentar
      </button>
    </div>
  );
}
