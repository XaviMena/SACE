"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Database,
  FileUp,
  LoaderCircle,
  Upload,
} from "lucide-react";
import { Boton } from "@/components/ui/boton";
import { useSesion } from "@/lib/auth/proveedor-sesion";
import type { EstadoImportacionAdmin } from "@/types/administracion";

const ETAPAS = [
  "Validación del archivo",
  "Lectura del esquema",
  "Importación de catálogos",
  "Importación de personas",
  "Importación de relaciones académicas",
  "Finalización",
] as const;

type EstadoVisualEtapa = "pendiente" | "activa" | "completada" | "error";

function obtenerIndiceEtapaActual(estado: EstadoImportacionAdmin | null) {
  const etapaActual = estado?.etapa_actual?.toLowerCase() ?? "";
  const indicePorNombre = ETAPAS.findIndex((etapa) => etapaActual.startsWith(etapa.toLowerCase()));

  if (indicePorNombre >= 0) {
    return indicePorNombre;
  }

  const porcentaje = estado?.porcentaje ?? 0;

  if (porcentaje >= 100) {
    return ETAPAS.length - 1;
  }

  if (porcentaje <= 0) {
    return -1;
  }

  return Math.min(
    ETAPAS.length - 1,
    Math.max(0, Math.floor((porcentaje / 100) * ETAPAS.length)),
  );
}

function obtenerEstadoGlobal(estado: EstadoImportacionAdmin | null) {
  if (!estado) {
    return {
      etiqueta: "Listo para iniciar",
      titulo: "Prepara el archivo para comenzar la importación.",
      descripcion: "Selecciona el archivo institucional y luego inicia el proceso para cargar la información.",
      clase: "estado-linea",
    };
  }

  if (estado.estado === "error") {
    return {
      etiqueta: "Importación con error",
      titulo: "La importación no pudo completarse.",
      descripcion: estado.error_mensaje ?? "Revisa el archivo o vuelve a intentarlo cuando lo necesites.",
      clase: "estado-linea estado-linea-alerta",
    };
  }

  if (estado.estado === "completado") {
    const tieneObservaciones = estado.advertencias.length > 0 || estado.errores > 0;

    return {
      etiqueta: tieneObservaciones ? "Finalizada con observaciones" : "Importación finalizada",
      titulo: tieneObservaciones
        ? "La importación terminó y dejó observaciones para revisión."
        : "La importación terminó correctamente.",
      descripcion: tieneObservaciones
        ? "Revisa el resumen y las observaciones para confirmar qué elementos requieren atención."
        : "La información ya fue procesada y el resumen está disponible más abajo.",
      clase: tieneObservaciones ? "estado-linea estado-linea-alerta" : "estado-linea estado-linea-ok",
    };
  }

  return {
    etiqueta: "Importación en curso",
    titulo: estado.etapa_actual || "Estamos procesando la información.",
    descripcion: "Puedes seguir el avance en tiempo real mientras se completan las etapas de carga.",
    clase: "estado-linea estado-linea-alerta",
  };
}

function obtenerEstadoEtapa(
  estado: EstadoImportacionAdmin | null,
  indice: number,
  indiceActual: number,
): EstadoVisualEtapa {
  if (estado?.estado === "error") {
    if (indice < indiceActual) {
      return "completada";
    }

    if (indice === indiceActual) {
      return "error";
    }
  }

  if (estado?.estado === "completado") {
    return "completada";
  }

  if (indiceActual < 0) {
    return "pendiente";
  }

  if (indice < indiceActual) {
    return "completada";
  }

  if (indice === indiceActual) {
    return "activa";
  }

  return "pendiente";
}

function iconoEtapa(estadoEtapa: EstadoVisualEtapa) {
  if (estadoEtapa === "completada") {
    return <CheckCircle2 className="size-5 text-[var(--color-exito)]" />;
  }

  if (estadoEtapa === "activa") {
    return <LoaderCircle className="size-5 animate-spin text-[var(--color-acento)]" />;
  }

  if (estadoEtapa === "error") {
    return <AlertCircle className="size-5 text-[var(--color-alerta)]" />;
  }

  return <Circle className="size-5 text-[var(--color-texto-suave)]" />;
}

function formatearFecha(valor?: string) {
  if (!valor) {
    return null;
  }

  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(valor));
}

export function PaginaImportacionCliente() {
  const { usuario } = useSesion();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [estado, setEstado] = useState<EstadoImportacionAdmin | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [estaPendiente, startTransition] = useTransition();
  const intervalo = useRef<number | null>(null);

  const esAdmin = usuario?.rol === "admin";
  const resumenVisible = useMemo(() => estado?.tablas ?? [], [estado]);
  const indiceEtapaActual = useMemo(() => obtenerIndiceEtapaActual(estado), [estado]);
  const estadoGlobal = useMemo(() => obtenerEstadoGlobal(estado), [estado]);
  const archivoBloqueado = estaPendiente || estado?.estado === "ejecutando";
  const fechaFinalizacion = formatearFecha(estado?.finalizado_en);

  useEffect(() => {
    return () => {
      if (intervalo.current) {
        window.clearInterval(intervalo.current);
      }
    };
  }, []);

  const iniciarPolling = (jobId: string) => {
    if (intervalo.current) {
      window.clearInterval(intervalo.current);
    }

    const cargar = async () => {
      const respuesta = await fetch(`/api/administracion/importaciones/${jobId}`, {
        cache: "no-store",
        headers: {
          "x-sace-uid": usuario?.uid ?? "",
        },
      });
      const datos = (await respuesta.json()) as {
        ok?: boolean;
        mensaje?: string;
        estado?: EstadoImportacionAdmin;
      };

      if (!respuesta.ok || datos.ok === false || !datos.estado) {
        setMensaje(datos.mensaje ?? "No se pudo consultar el estado de la importación.");

        if (intervalo.current) {
          window.clearInterval(intervalo.current);
        }

        return;
      }

      setEstado(datos.estado);

      if (["completado", "error"].includes(datos.estado.estado) && intervalo.current) {
        window.clearInterval(intervalo.current);
      }
    };

    void cargar();
    intervalo.current = window.setInterval(() => {
      void cargar();
    }, 1200);
  };

  const iniciarImportacion = () => {
    if (!archivo || !usuario) {
      setMensaje("Selecciona primero un archivo institucional para continuar.");
      return;
    }

    setMensaje(null);
    setEstado(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.append("archivo", archivo);

      const respuesta = await fetch("/api/administracion/importaciones", {
        method: "POST",
        headers: {
          "x-sace-uid": usuario.uid,
        },
        body: formData,
      });

      const datos = (await respuesta.json()) as {
        ok?: boolean;
        mensaje?: string;
        job_id?: string;
      };

      if (!respuesta.ok || datos.ok === false || !datos.job_id) {
        setMensaje(datos.mensaje ?? "No se pudo iniciar la importación.");
        return;
      }

      setMensaje(datos.mensaje ?? "La importación fue iniciada correctamente.");
      iniciarPolling(datos.job_id);
    });
  };

  if (!esAdmin) {
    return null;
  }

  return (
    <div className="space-y-8">
      <section className="space-y-5 border-b border-[var(--color-borde-suave)] pb-6">
        <div className="space-y-2">
          <p className="titulo-seccion text-[var(--color-acento)]">Importación institucional</p>
          <h1 className="titular-editorial titulo-pagina text-[var(--color-texto)]">
            Carga el archivo y sigue el proceso paso a paso.
          </h1>
          <p className="descripcion-pagina max-w-3xl texto-suave">
            La importación se realiza en una sola secuencia y te muestra el avance, el resumen final y cualquier observación relevante.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4 rounded-[1.75rem] border border-[var(--color-borde)] bg-[rgba(255,255,255,0.84)] p-5 shadow-[0_16px_40px_rgba(12,37,46,0.05)]">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-[rgba(10,158,189,0.1)] p-3 text-[var(--color-acento)]">
                <FileUp className="size-5" />
              </div>
              <div className="space-y-1">
                <p className="titulo-seccion text-[var(--color-texto)]">Carga del archivo</p>
                <p className="texto-cuerpo texto-suave">
                  Selecciona el archivo institucional para iniciar la actualización de la información.
                </p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="space-y-3">
                <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--color-borde)] bg-[var(--color-superficie)] px-4 py-5 text-[var(--tamano-ui)] font-semibold text-[var(--color-texto)] transition hover:bg-[var(--color-superficie-secundaria)]">
                  <Upload className="size-4" />
                  {archivo ? "Cambiar archivo" : "Seleccionar archivo"}
                  <input
                    className="sr-only"
                    type="file"
                    accept=".db,.sqlite"
                    disabled={archivoBloqueado}
                    onChange={(evento) => setArchivo(evento.target.files?.[0] ?? null)}
                  />
                </label>

                <div className="rounded-2xl border border-[var(--color-borde-suave)] bg-[rgba(248,250,251,0.8)] px-4 py-3">
                  <p className="sobrelinea-ui text-[var(--color-texto-suave)]">Archivo seleccionado</p>
                  <p className="mt-1 titulo-bloque text-[var(--color-texto)]">
                    {archivo?.name ?? "Aún no se ha seleccionado ningún archivo."}
                  </p>
                  <p className="mt-1 texto-ayuda">
                    {archivo
                      ? "El archivo está listo para iniciar la importación."
                      : "Acepta archivos con extensión .db o .sqlite."}
                  </p>
                </div>
              </div>

              <Boton
                type="button"
                onClick={iniciarImportacion}
                disabled={estaPendiente || !archivo || estado?.estado === "ejecutando"}
                className="min-w-52"
              >
                <Database className="mr-2 size-4" />
                {estado?.estado === "ejecutando"
                  ? "Importando..."
                  : estaPendiente
                    ? "Preparando..."
                    : "Iniciar importación"}
              </Boton>
            </div>
          </div>

          <div className="space-y-4 rounded-[1.75rem] border border-[var(--color-borde)] bg-[rgba(255,255,255,0.92)] p-5 shadow-[0_16px_40px_rgba(12,37,46,0.05)]">
            <div className="flex items-center justify-between gap-3">
              <p className={estadoGlobal.clase}>{estadoGlobal.etiqueta}</p>
              <p className="titulo-bloque text-[var(--color-texto)]">{estado?.porcentaje ?? 0}%</p>
            </div>

            <div className="space-y-2">
              <p className="titulo-bloque text-[var(--color-texto)]">{estadoGlobal.titulo}</p>
              <p className="texto-cuerpo texto-suave">{estadoGlobal.descripcion}</p>
            </div>

            <div className="space-y-2">
              <div className="sobrelinea-ui flex items-center justify-between text-[var(--color-texto-suave)]">
                <span>Avance general</span>
                <span>{estado?.porcentaje ?? 0}%</span>
              </div>
              <div className="barra-progreso">
                <span style={{ width: `${estado?.porcentaje ?? 0}%` }} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-[rgba(248,250,251,0.85)] px-4 py-3">
                <p className="sobrelinea-ui text-[var(--color-texto-suave)]">Etapa actual</p>
                <p className="mt-1 texto-cuerpo text-[var(--color-texto)]">
                  {estado?.etapa_actual ?? "Esperando el inicio del proceso."}
                </p>
              </div>

              <div className="rounded-2xl bg-[rgba(248,250,251,0.85)] px-4 py-3">
                <p className="sobrelinea-ui text-[var(--color-texto-suave)]">Cierre del proceso</p>
                <p className="mt-1 texto-cuerpo text-[var(--color-texto)]">
                  {fechaFinalizacion ?? "Se mostrará cuando la importación termine."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {mensaje ? (
          <div className="banda-estado">
            <p className="texto-cuerpo text-[var(--color-texto)]">{mensaje}</p>
          </div>
        ) : null}
      </section>

      <section className="space-y-5 border-b border-[var(--color-borde-suave)] pb-6">
        <div className="space-y-1">
          <p className="titulo-seccion text-[var(--color-acento)]">Recorrido de la importación</p>
          <p className="texto-cuerpo texto-suave">
            Cada etapa se actualiza automáticamente mientras avanza el proceso.
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-6">
          {ETAPAS.map((etapa, indice) => {
            const estadoEtapa = obtenerEstadoEtapa(estado, indice, indiceEtapaActual);

            return (
              <div
                key={etapa}
                className={
                  estadoEtapa === "activa"
                    ? "rounded-[1.5rem] border border-[rgba(10,158,189,0.22)] bg-[rgba(10,158,189,0.07)] p-4"
                    : estadoEtapa === "completada"
                      ? "rounded-[1.5rem] border border-[rgba(31,122,79,0.18)] bg-[rgba(31,122,79,0.06)] p-4"
                      : estadoEtapa === "error"
                        ? "rounded-[1.5rem] border border-[rgba(183,121,31,0.2)] bg-[rgba(183,121,31,0.08)] p-4"
                        : "rounded-[1.5rem] border border-[var(--color-borde-suave)] bg-[rgba(255,255,255,0.74)] p-4"
                }
              >
                <div className="flex items-center gap-3">
                  {iconoEtapa(estadoEtapa)}
                  <span className="sobrelinea-ui text-[var(--color-texto-suave)]">
                    Paso {indice + 1}
                  </span>
                </div>
                <p className="mt-3 texto-cuerpo text-[var(--color-texto)]">{etapa}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-5">
        <div className="space-y-1">
          <p className="titulo-seccion text-[var(--color-acento)]">Resultado de la importación</p>
          <p className="texto-cuerpo texto-suave">
            Aquí se resume lo procesado durante la carga y el detalle por cada dominio.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-[1.5rem] border border-[var(--color-borde-suave)] bg-[rgba(255,255,255,0.8)] p-4">
            <p className="titulo-seccion text-[var(--color-acento)]">Procesados</p>
            <p className="numero-metrica mt-2 text-[var(--color-texto)]">{estado?.total_procesado ?? 0}</p>
          </div>
          <div className="rounded-[1.5rem] border border-[var(--color-borde-suave)] bg-[rgba(255,255,255,0.8)] p-4">
            <p className="titulo-seccion text-[var(--color-acento)]">Creados</p>
            <p className="numero-metrica mt-2 text-[var(--color-texto)]">{estado?.creados ?? 0}</p>
          </div>
          <div className="rounded-[1.5rem] border border-[var(--color-borde-suave)] bg-[rgba(255,255,255,0.8)] p-4">
            <p className="titulo-seccion text-[var(--color-acento)]">Actualizados</p>
            <p className="numero-metrica mt-2 text-[var(--color-texto)]">{estado?.actualizados ?? 0}</p>
          </div>
          <div className="rounded-[1.5rem] border border-[var(--color-borde-suave)] bg-[rgba(255,255,255,0.8)] p-4">
            <p className="titulo-seccion text-[var(--color-acento)]">Omitidos</p>
            <p className="numero-metrica mt-2 text-[var(--color-texto)]">{estado?.omitidos ?? 0}</p>
          </div>
          <div className="rounded-[1.5rem] border border-[var(--color-borde-suave)] bg-[rgba(255,255,255,0.8)] p-4">
            <p className="titulo-seccion text-[var(--color-acento)]">Errores</p>
            <p className="numero-metrica mt-2 text-[var(--color-texto)]">{estado?.errores ?? 0}</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-[1.5rem] border border-[var(--color-borde-suave)] bg-[rgba(255,255,255,0.86)] p-5">
          <div className="mb-4">
            <p className="titulo-seccion text-[var(--color-acento)]">Detalle por dominio</p>
          </div>

          <table className="tabla-editorial min-w-full">
            <thead>
              <tr>
                <th>Dominio</th>
                <th>Procesados</th>
                <th>Creados</th>
                <th>Actualizados</th>
                <th>Omitidos</th>
                <th>Errores</th>
              </tr>
            </thead>
            <tbody>
              {resumenVisible.map((fila) => (
                <tr key={fila.tabla}>
                  <td>{fila.etiqueta}</td>
                  <td>{fila.procesados}</td>
                  <td>{fila.creados}</td>
                  <td>{fila.actualizados}</td>
                  <td>{fila.omitidos}</td>
                  <td>{fila.errores}</td>
                </tr>
              ))}
              {resumenVisible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[var(--tamano-ui)] text-[var(--color-texto-suave)]">
                    El detalle aparecerá aquí cuando la importación empiece a procesar la información.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {estado?.advertencias.length ? (
          <div className="rounded-[1.5rem] border border-[rgba(183,121,31,0.18)] bg-[rgba(183,121,31,0.07)] p-5">
            <p className="titulo-seccion text-[var(--color-alerta)]">Observaciones</p>
            <ul className="mt-3 space-y-2 texto-ayuda">
              {estado.advertencias.slice(0, 8).map((advertencia) => (
                <li key={advertencia}>{advertencia}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}
