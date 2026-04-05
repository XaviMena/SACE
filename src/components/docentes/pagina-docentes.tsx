"use client";

import { useCallback, useEffect, useState } from "react";
import { ModuloDocentes } from "@/components/docentes/modulo-docentes";
import { EncabezadoPagina } from "@/components/layout/encabezado-pagina";
import { useSesion } from "@/lib/auth/proveedor-sesion";
import type { DocenteConUsuario } from "@/types/administracion";

export function PaginaDocentesCliente() {
  const { usuario, puedeAccederPanel, cargando } = useSesion();
  const [docentes, setDocentes] = useState<DocenteConUsuario[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const esAdmin = usuario?.rol === "admin";

  const cargarDocentes = useCallback(async () => {
    if (!usuario) {
      return;
    }

    const respuesta = await fetch("/api/administracion/docentes", {
      cache: "no-store",
      headers: {
        "x-sace-uid": usuario.uid,
      },
    });
    const datos = (await respuesta.json()) as {
      ok?: boolean;
      mensaje?: string;
      docentes?: DocenteConUsuario[];
    };

    if (!respuesta.ok || datos.ok === false) {
      throw new Error(datos.mensaje ?? "No se pudo cargar la lista de docentes.");
    }

    setDocentes(datos.docentes ?? []);
  }, [usuario]);

  useEffect(() => {
    if (cargando || !puedeAccederPanel || !esAdmin) {
      return;
    }

    let activo = true;
    const temporizador = window.setTimeout(() => {
      void cargarDocentes()
        .catch(() => {
          if (activo) {
            setDocentes([]);
          }
        })
        .finally(() => {
          if (activo) {
            setCargandoDatos(false);
          }
        });
    }, 0);

    return () => {
      activo = false;
      window.clearTimeout(temporizador);
    };
  }, [cargando, puedeAccederPanel, esAdmin, cargarDocentes]);

  if (!esAdmin) {
    return null;
  }

  if (cargandoDatos) {
    return (
      <div className="space-y-8">
        <EncabezadoPagina
          titulo="Cambio de rol"
          descripcion="Cargando la lista de docentes con su acceso vinculado."
        />

        <div className="superficie rounded-[1.75rem] p-6">
          <p className="text-[var(--tamano-ui)] texto-suave">Preparando la tabla de cambio de rol...</p>
        </div>
      </div>
    );
  }

  return <ModuloDocentes docentes={docentes} onRecargar={cargarDocentes} />;
}
