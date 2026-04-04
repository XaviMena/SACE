import type { ReactNode } from "react";

export function BarraFiltros({ children }: { children: ReactNode }) {
  return (
    <div className="superficie flex flex-col gap-4 rounded-[1.5rem] p-5 md:flex-row md:items-center md:justify-between">
      {children}
    </div>
  );
}
