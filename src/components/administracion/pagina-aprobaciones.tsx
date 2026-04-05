"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { RotateCcw, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { EncabezadoPagina } from "@/components/layout/encabezado-pagina";
import { Boton } from "@/components/ui/boton";
import { useSesion } from "@/lib/auth/proveedor-sesion";
import type { SolicitudAccesoDocente } from "@/types/administracion";

function formatear_fecha(valor: string) {
  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(valor));
}

export function PaginaAprobacionesCliente() {
  const { usuario, cargando, puedeAccederPanel } = useSesion();
  const [solicitudes, setSolicitudes] = useState<SolicitudAccesoDocente[]>([]);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [uidSeleccionado, setUidSeleccionado] = useState<string | null>(null);
  const [estaPendiente, startTransition] = useTransition();
  const esAdmin = usuario?.rol === "admin";
  const solicitudesPendientes = solicitudes.filter((solicitud) => solicitud.estado === "pendiente_registro");
  const solicitudesAprobadas = solicitudes.filter((solicitud) => solicitud.estado === "activo");

  const cargarSolicitudes = useCallback(async () => {
    if (!usuario) {
      return;
    }

    const respuesta = await fetch("/api/administracion/aprobaciones", {
      cache: "no-store",
      headers: {
        "x-sace-uid": usuario.uid,
      },
    });

    const datos = (await respuesta.json()) as {
      ok?: boolean;
      mensaje?: string;
      solicitudes?: SolicitudAccesoDocente[];
    };

    if (!respuesta.ok || datos.ok === false) {
      throw new Error(datos.mensaje ?? "No se pudieron cargar las solicitudes.");
    }

    setSolicitudes(datos.solicitudes ?? []);
  }, [usuario]);

  useEffect(() => {
    if (cargando || !puedeAccederPanel || !esAdmin) {
      return;
    }

    let activo = true;

    void cargarSolicitudes()
      .catch((error) => {
        if (activo) {
          setMensaje(error instanceof Error ? error.message : "No se pudieron cargar las solicitudes.");
        }
      });

    return () => {
      activo = false;
    };
  }, [cargando, puedeAccederPanel, esAdmin, cargarSolicitudes]);

  const resolverAccion = (uid: string, accion: "aprobar" | "bloquear" | "eliminar" | "revocar") => {
    setUidSeleccionado(uid);
    setMensaje(null);

    startTransition(async () => {
      try {
        if (!usuario) {
          throw new Error("No se pudo identificar la sesión administrativa.");
        }

        const respuesta = await fetch(`/api/administracion/aprobaciones/${uid}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-sace-uid": usuario.uid,
          },
          body: JSON.stringify({ accion }),
        });

        const datos = (await respuesta.json()) as { ok?: boolean; mensaje?: string };

        if (!respuesta.ok || datos.ok === false) {
          throw new Error(datos.mensaje ?? "No se pudo actualizar la solicitud.");
        }

        setMensaje(
          accion === "aprobar"
            ? "La solicitud fue aprobada y el docente ya puede ingresar al sistema."
            : accion === "revocar"
              ? "La aprobación fue revocada. El docente volvió a estado pendiente."
            : accion === "bloquear"
              ? "La solicitud fue bloqueada correctamente."
              : "La solicitud fue eliminada. El docente podrá volver a enviarla cuando lo necesite.",
        );

        await cargarSolicitudes();
      } catch (error) {
        setMensaje(error instanceof Error ? error.message : "No se pudo actualizar la solicitud.");
      } finally {
        setUidSeleccionado(null);
      }
    });
  };

  if (!esAdmin) {
    return null;
  }

  return (
    <div className="space-y-8">
      <EncabezadoPagina
        titulo="Aprobaciones docentes"
        descripcion="Revisa las solicitudes docentes y decide cuándo habilitar su acceso al sistema."
      />

      <section className="space-y-4 border-b border-[var(--color-borde-suave)] pb-6">
        <div>
          <p className="titulo-seccion text-[var(--color-acento)]">
            Solicitudes pendientes
          </p>
          <p className="numero-metrica mt-2 text-[var(--color-texto)]">{solicitudesPendientes.length}</p>
        </div>

        {mensaje ? (
          <div className="banda-estado">
            <p className="texto-cuerpo text-[var(--color-texto)]">{mensaje}</p>
          </div>
        ) : null}
      </section>

      <section className="overflow-x-auto border-b border-[var(--color-borde-suave)] pb-6">
        <table className="tabla-editorial min-w-full">
          <thead>
            <tr>
              <th>Docente</th>
              <th>Correo</th>
              <th>Último acceso</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {solicitudesPendientes.map((solicitud) => {
              return (
                <tr key={solicitud.uid}>
                <td>
                  <div className="space-y-1">
                    <p className="titulo-bloque text-[var(--color-texto)]">{solicitud.nombres}</p>
                    <p className="sobrelinea-ui text-[var(--color-texto-suave)]">
                      Cédula {solicitud.cedula}
                    </p>
                  </div>
                </td>
                <td>{solicitud.correo}</td>
                <td>{formatear_fecha(solicitud.ultimo_acceso)}</td>
                <td>
                  <div className="flex justify-end gap-2">
                    <Boton
                      type="button"
                      variante="fantasma"
                      onClick={() => resolverAccion(solicitud.solicitud_id, "eliminar")}
                      disabled={estaPendiente && uidSeleccionado === solicitud.solicitud_id}
                    >
                      <Trash2 className="mr-2 size-4" />
                      Eliminar
                    </Boton>
                    <Boton
                      type="button"
                      variante="fantasma"
                      onClick={() => resolverAccion(solicitud.solicitud_id, "bloquear")}
                      disabled={estaPendiente && uidSeleccionado === solicitud.solicitud_id}
                    >
                      <ShieldOff className="mr-2 size-4" />
                      Bloquear
                    </Boton>
                    <Boton
                      type="button"
                      onClick={() => resolverAccion(solicitud.solicitud_id, "aprobar")}
                      disabled={estaPendiente && uidSeleccionado === solicitud.solicitud_id}
                    >
                      <ShieldCheck className="mr-2 size-4" />
                      Aprobar
                    </Boton>
                  </div>
                </td>
                </tr>
              );
            })}
            {solicitudesPendientes.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-[var(--tamano-ui)] text-[var(--color-texto-suave)]">
                  No hay solicitudes pendientes por revisar.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="overflow-x-auto border-b border-[var(--color-borde-suave)] pb-6">
        <div className="mb-4">
          <p className="titulo-seccion text-[var(--color-acento)]">Docentes aprobados</p>
        </div>

        <table className="tabla-editorial min-w-full">
          <thead>
            <tr>
              <th>Docente</th>
              <th>Correo</th>
              <th>Último acceso</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {solicitudesAprobadas.map((solicitud) => (
              <tr key={solicitud.uid}>
                <td>
                  <div className="space-y-1">
                    <p className="titulo-bloque text-[var(--color-texto)]">{solicitud.nombres}</p>
                    <p className="sobrelinea-ui text-[var(--color-texto-suave)]">
                      Cédula {solicitud.cedula}
                    </p>
                  </div>
                </td>
                <td>{solicitud.correo}</td>
                <td>{formatear_fecha(solicitud.ultimo_acceso)}</td>
                <td>
                  <div className="flex justify-end gap-2">
                    <Boton
                      type="button"
                      variante="fantasma"
                      onClick={() => resolverAccion(solicitud.solicitud_id, "revocar")}
                      disabled={
                        solicitud.uid === usuario?.uid ||
                        (estaPendiente && uidSeleccionado === solicitud.solicitud_id)
                      }
                    >
                      <RotateCcw className="mr-2 size-4" />
                      Revocar aprobación
                    </Boton>
                  </div>
                </td>
              </tr>
            ))}
            {solicitudesAprobadas.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-[var(--tamano-ui)] text-[var(--color-texto-suave)]">
                  No hay docentes aprobados para mostrar.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
