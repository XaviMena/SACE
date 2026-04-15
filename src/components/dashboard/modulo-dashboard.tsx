"use client";

import { useEffect, useState } from "react";
import { useSesion } from "@/lib/auth/proveedor-sesion";
import type { DashboardPayload } from "@/lib/repositorios/dashboard-servidor";

export function ModuloDashboard() {
  const { usuario, puedeAccederPanel, cargando } = useSesion();
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const sesionLista = !cargando && puedeAccederPanel && Boolean(usuario);
  const usuarioUid = usuario?.uid ?? null;

  useEffect(() => {
    if (!sesionLista || !usuarioUid) {
      return;
    }

    let activo = true;

    queueMicrotask(() => {
      if (!activo) {
        return;
      }

      setCargandoDatos(true);
      setMensajeError(null);
    });

    void fetch("/api/dashboard", {
      cache: "no-store",
      headers: {
        "x-sace-uid": usuarioUid,
      },
    })
      .then(async (respuesta) => {
        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(datos.mensaje ?? "No se pudo cargar el dashboard administrativo.");
        }

        if (!activo) {
          return;
        }

        setMensajeError(null);
        setDashboard(datos.dashboard as DashboardPayload);
      })
      .catch((error) => {
        if (!activo) {
          return;
        }

        setMensajeError(error instanceof Error ? error.message : "No se pudo cargar el dashboard.");
        setDashboard(null);
      })
      .finally(() => {
        if (activo) {
          setCargandoDatos(false);
        }
      });

    return () => {
      activo = false;
    };
  }, [sesionLista, usuarioUid]);

  if (cargando || (sesionLista && cargandoDatos)) {
    return (
      <div className="space-y-5">
        <div className="superficie rounded-[0.5rem] p-4">
          <p className="texto-cuerpo texto-suave">Cargando información del panel.</p>
        </div>
      </div>
    );
  }

  if (!sesionLista) {
    return (
      <div className="space-y-5">
        <div className="superficie rounded-[0.5rem] p-4">
          <p className="texto-cuerpo text-[var(--color-peligro)]">
            Inicia sesión nuevamente para cargar el panel.
          </p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="space-y-5">
        <div className="superficie rounded-[0.5rem] p-4">
          <p className="texto-cuerpo text-[var(--color-peligro)]">
            {mensajeError ?? "No fue posible obtener el dashboard en este momento."}
          </p>
        </div>
      </div>
    );
  }

  const resumen = dashboard.resumen_admin;
  const distributivo = dashboard.distributivo_docente;

  return (
    <div className="space-y-4">
      {resumen ? (
        <section className="rejilla-datos">
          <div className="space-y-3">
            <div className="superficie rounded-[0.5rem] p-4">
              <p className="titulo-seccion text-[var(--color-acento)]">
                Resumen operativo
              </p>
              <div className="rejilla-metricas-compacta mt-3">
                <div className="tarjeta-operativa-suave">
                  <p className="texto-ayuda">Periodo activo</p>
                  <p className="mt-1 titulo-bloque">{resumen.periodo_activo}</p>
                </div>
                <div className="tarjeta-operativa-suave">
                  <p className="texto-ayuda">Docentes cargados</p>
                  <p className="mt-1 numero-metrica">{resumen.docentes}</p>
                </div>
                <div className="tarjeta-operativa-suave">
                  <p className="texto-ayuda">Estudiantes cargados</p>
                  <p className="mt-1 numero-metrica">{resumen.estudiantes}</p>
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-3">
            <div className="superficie rounded-[0.5rem] p-4">
              <p className="titulo-seccion text-[var(--color-acento)]">
                Resumen administrativo
              </p>
              <div className="mt-2.5 space-y-1">
                <p className="texto-ayuda">Solicitudes pendientes: {resumen.solicitudes_pendientes}</p>
                <p className="texto-ayuda">Rol visible: admin</p>
              </div>
            </div>

          </aside>
        </section>
      ) : null}

      {distributivo ? (
        <section className="space-y-2.5 pt-1">
          <div className="space-y-1">
            <p className="titulo-seccion text-[var(--color-acento)]">
              Mi distributivo de trabajo
            </p>
            <p className="texto-cuerpo texto-suave">{distributivo.nombre}</p>
          </div>

          <div className="superficie rounded-[0.5rem] p-4">
            <div className="rejilla-metricas-compacta">
              <div className="tarjeta-operativa-suave">
                <p className="texto-ayuda">Docente</p>
                <p className="mt-1 titulo-bloque">{distributivo.docente_id}</p>
              </div>
              <div className="tarjeta-operativa-suave">
                <p className="texto-ayuda">Asignaciones</p>
                <p className="mt-1 numero-metrica">{distributivo.total_asignaciones}</p>
              </div>
              <div className="tarjeta-operativa-suave">
                <p className="texto-ayuda">Horas asignadas</p>
                <p className="mt-1 numero-metrica">{distributivo.total_horas}</p>
              </div>
            </div>
          </div>

          <div className="tarjeta-operativa overflow-x-auto">
            <table className="tabla-editorial min-w-full">
              <thead>
                <tr>
                  <th>Asignatura</th>
                  <th>Paralelo</th>
                  <th>Jornada</th>
                  <th>Horas</th>
                </tr>
              </thead>
              <tbody>
                {distributivo.items.map((item) => (
                  <tr key={item.asignacion_id}>
                    <td>{item.asignatura}</td>
                    <td>{item.paralelo}</td>
                    <td>{item.jornada ?? "Sin jornada"}</td>
                    <td>{item.horas_asignadas}</td>
                  </tr>
                ))}
                {distributivo.items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-[var(--tamano-ui)] text-[var(--color-texto-suave)]">
                      No hay asignaciones cargadas para tu perfil docente.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
