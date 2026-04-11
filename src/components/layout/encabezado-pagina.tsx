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
        <h1 className="titular-editorial titulo-pagina text-[var(--color-acento)]">
          {titulo}
        </h1>
        <p className="descripcion-pagina max-w-3xl texto-suave">{descripcion}</p>
      </div>
      {acciones ? <div className="flex items-center gap-3">{acciones}</div> : null}
    </div>
  );
}
