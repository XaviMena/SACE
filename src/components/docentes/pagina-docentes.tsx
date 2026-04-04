"use client";

import { useEffect, useState } from "react";
import { ModuloDocentes } from "@/components/docentes/modulo-docentes";
import { EncabezadoPagina } from "@/components/layout/encabezado-pagina";
import { useSesion } from "@/lib/auth/proveedor-sesion";
import { listar_docentes } from "@/lib/repositorios/docentes";
import type { Docente } from "@/types/docentes";

export function PaginaDocentesCliente() {
  const { puedeAccederPanel, cargando } = useSesion();
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);

  useEffect(() => {
    if (cargando || !puedeAccederPanel) {
      return;
    }

    let activo = true;

    void listar_docentes()
      .then((resultado) => {
        if (activo) {
          setDocentes(resultado);
        }
      })
      .finally(() => {
        if (activo) {
          setCargandoDatos(false);
        }
      });

    return () => {
      activo = false;
    };
  }, [cargando, puedeAccederPanel]);

  if (cargandoDatos) {
    return (
      <div className="space-y-8">
        <EncabezadoPagina
          titulo="Docentes"
          descripcion="Cargando base operativa de docentes desde la identidad persistente del sistema."
        />

        <div className="superficie rounded-[1.75rem] p-6">
          <p className="text-sm texto-suave">Preparando la tabla docente...</p>
        </div>
      </div>
    );
  }

  return <ModuloDocentes docentes={docentes} />;
}
