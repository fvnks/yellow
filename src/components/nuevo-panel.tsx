"use client";

import { useState } from "react";
import { Plus, X } from "@phosphor-icons/react";

/**
 * Botón "+ Nuevo" que despliega el formulario inline. El listado vive
 * siempre visible debajo; el formulario aparece entre el botón y la lista.
 */
export function NuevoPanel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setAbierto((prev) => !prev)}
        className={
          abierto
            ? "btn btn-ghost px-4 py-2 text-sm"
            : "btn btn-primary px-4 py-2 text-sm"
        }
      >
        {abierto ? (
          <>
            <X size={16} weight="bold" aria-hidden />
            Cerrar
          </>
        ) : (
          <>
            <Plus size={16} weight="bold" aria-hidden />
            {label}
          </>
        )}
      </button>
      {abierto && children}
    </div>
  );
}
