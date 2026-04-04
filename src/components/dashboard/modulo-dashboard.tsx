"use client";

import { useEffect, useState } from "react";
import { EncabezadoPagina } from "@/components/layout/encabezado-pagina";
import { useSesion } from "@/lib/auth/proveedor-sesion";
import { obtener_estado_firebase } from "@/lib/firebase/config";
import { listar_asignaciones_docentes } from "@/lib/repositorios/asignaciones";
import { listar_docentes } from "@/lib/repositorios/docentes";
import { obtener_periodo_activo } from "@/lib/repositorios/periodos";
import type { Docente } from "@/types/docentes";

interface PeriodoActivo {
  periodo_id: string;
  nombre: string;
  estado: string;
}

interface AsignacionDocente {
  asignacion_id: string;
  periodo_id: string;
  docente_id: string;
  asignatura: string;
  paralelo: string;
}

export function ModuloDashboard() {
  const firebase = obtener_estado_firebase();
  const { puedeAccederPanel, cargando } = useSesion();
  const [periodo, setPeriodo] = useState<PeriodoActivo | null>(null);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionDocente[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);

  useEffect(() => {
    if (cargando || !puedeAccederPanel) {
      return;
    }

    let activo = true;

    void obtener_periodo_activo()
      .then(async (periodoActual) => {
        const [docentesActuales, asignacionesActuales] = await Promise.all([
          listar_docentes(),
          listar_asignaciones_docentes(periodoActual.periodo_id),
        ]);

        if (!activo) {
          return;
        }

        setPeriodo(periodoActual);
        setDocentes(docentesActuales);
        setAsignaciones(asignacionesActuales);
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

  if (cargandoDatos || !periodo) {
    return (
      <div className="space-y-8">
        <EncabezadoPagina
          titulo="Dashboard institucional"
          descripcion="Cargando información."
        />

        <div className="superficie rounded-[1.75rem] p-6">
          <p className="text-sm texto-suave">Cargando datos institucionales desde {firebase.modo}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <EncabezadoPagina
        titulo="Dashboard institucional"
        descripcion="Resumen general."
      />

      <section className="rejilla-datos">
        <div className="space-y-6">
          <div className="superficie rounded-[1.75rem] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-acento)]">
              Resumen operativo
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm texto-suave">Periodo activo</p>
                <p className="mt-2 text-2xl font-semibold">{periodo.nombre}</p>
              </div>
              <div>
                <p className="text-sm texto-suave">Docentes cargados</p>
                <p className="mt-2 text-2xl font-semibold">{docentes.length}</p>
              </div>
              <div>
                <p className="text-sm texto-suave">Asignaciones semilla</p>
                <p className="mt-2 text-2xl font-semibold">{asignaciones.length}</p>
              </div>
            </div>
          </div>

        </div>

        <aside className="space-y-6">
          <div className="superficie rounded-[1.75rem] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-acento)]">
              Admin semilla
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <p className="font-semibold">Fernando Xavier Mena Paredes</p>
              <p className="texto-suave">Cédula: 0201305406</p>
              <p className="texto-suave">Correo: xavymena@gmail.com</p>
              <p className="texto-suave">Rol: admin</p>
            </div>
          </div>

          <div className="superficie rounded-[1.75rem] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-acento)]">Estado</p>
            <p className="mt-4 text-sm texto-suave">Fuente de datos: {firebase.modo}</p>
          </div>
        </aside>
      </section>
    </div>
  );
}
