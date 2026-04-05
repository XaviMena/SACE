import type { ReactNode } from "react";

export function EstadoVacio({
  titulo,
  descripcion,
  accion,
}: {
  titulo: string;
  descripcion: string;
  accion?: ReactNode;
}) {
  return (
    <div className="superficie flex min-h-56 flex-col items-start justify-center rounded-[1.75rem] p-8">
      <p className="titular-editorial text-[var(--tamano-ui)] font-medium">{titulo}</p>
      <p className="mt-3 max-w-xl text-[var(--tamano-ui)] leading-6 texto-suave">{descripcion}</p>
      {accion ? <div className="mt-6">{accion}</div> : null}
    </div>
  );
}
