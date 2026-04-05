"use client";

import dynamic from "next/dynamic";

const FormularioAccesoCargado = dynamic(
  () => import("@/components/formularios/formulario-acceso").then((mod) => mod.FormularioAcceso),
  {
    ssr: false,
    loading: () => <div className="h-[25rem]" />,
  },
);

export function FormularioAccesoDinamico() {
  return <FormularioAccesoCargado />;
}
