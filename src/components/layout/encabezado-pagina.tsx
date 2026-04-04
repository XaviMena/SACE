import type { ReactNode } from "react";

export function EncabezadoPagina({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string;
  descripcion: string;
  acciones?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--color-borde-suave)] pb-6 md:flex-row md:items-end md:justify-between">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-acento)]">
          SACE
        </p>
        <h1 className="titular-editorial text-4xl leading-none font-medium text-[var(--color-texto)]">
          {titulo}
        </h1>
        <p className="max-w-3xl text-sm leading-6 texto-suave">{descripcion}</p>
      </div>
      {acciones ? <div className="flex items-center gap-3">{acciones}</div> : null}
    </div>
  );
}
