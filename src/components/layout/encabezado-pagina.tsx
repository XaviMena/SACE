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
    <div className="panel-encabezado-compacto">
      <div className="space-y-1.5">
        <h1 className="titular-editorial titulo-pagina text-[var(--color-acento)]">
          {titulo}
        </h1>
        <p className="descripcion-pagina max-w-3xl texto-suave">{descripcion}</p>
      </div>
      {acciones ? <div className="flex items-center gap-2">{acciones}</div> : null}
    </div>
  );
}
