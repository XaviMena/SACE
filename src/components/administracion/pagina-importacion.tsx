"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Database, Upload } from "lucide-react";
import { EncabezadoPagina } from "@/components/layout/encabezado-pagina";
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
];

export function PaginaImportacionCliente() {
  const { usuario } = useSesion();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [estado, setEstado] = useState<EstadoImportacionAdmin | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [estaPendiente, startTransition] = useTransition();
  const intervalo = useRef<number | null>(null);

  const esAdmin = usuario?.rol === "admin";

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
      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setMensaje(datos.mensaje ?? "No se pudo consultar el estado de la importación.");
        return;
      }

      setEstado(datos.estado as EstadoImportacionAdmin);

      if (["completado", "error"].includes(datos.estado.estado) && intervalo.current) {
        window.clearInterval(intervalo.current);
      }
    };

    void cargar();
    intervalo.current = window.setInterval(() => {
      void cargar();
    }, 1200);
  };

  const resumenVisible = useMemo(() => estado?.tablas ?? [], [estado]);

  const iniciarImportacion = () => {
    if (!archivo || !usuario) {
      setMensaje("Selecciona primero un archivo SQLite.");
      return;
    }

    setMensaje(null);

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

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setMensaje(datos.mensaje ?? "No se pudo iniciar la importación.");
        return;
      }

      setMensaje(datos.mensaje);
      iniciarPolling(datos.job_id as string);
    });
  };

  if (!esAdmin) {
    return null;
  }

  return (
    <div className="space-y-8">
      <EncabezadoPagina
        titulo="Importación SQLite"
        descripcion="Sube `Distributivo.db` para poblar la nueva base institucional con progreso visible y resumen por dominio."
        acciones={
          <div className="flex flex-wrap gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-[var(--color-borde)] px-4 py-2.5 text-[var(--tamano-ui)] font-semibold text-[var(--color-texto)] transition hover:bg-[var(--color-superficie-secundaria)]">
              <Upload className="size-4" />
              Seleccionar archivo
              <input
                className="sr-only"
                type="file"
                accept=".db,.sqlite"
                onChange={(evento) => setArchivo(evento.target.files?.[0] ?? null)}
              />
            </label>
            <Boton type="button" onClick={iniciarImportacion} disabled={estaPendiente || !archivo}>
              <Database className="mr-2 size-4" />
              {estaPendiente ? "Iniciando..." : "Importar base"}
            </Boton>
          </div>
        }
      />

      <section className="space-y-4 border-b border-[var(--color-borde-suave)] pb-6">
        <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            <p className="titulo-seccion text-[var(--color-acento)]">
              Archivo seleccionado
            </p>
            <p className="titulo-bloque text-[var(--color-texto)]">
              {archivo?.name ?? "Aún no se ha seleccionado un archivo SQLite."}
            </p>
            <p className="texto-cuerpo texto-suave">
              La importación trabaja por etapas, conserva registros existentes y actualiza coincidencias por clave estable.
            </p>
          </div>

          <div className="space-y-3">
            <div className="sobrelinea-ui flex items-center justify-between text-[var(--color-texto-suave)]">
              <span>Progreso general</span>
              <span>{estado?.porcentaje ?? 0}%</span>
            </div>
            <div className="barra-progreso">
              <span style={{ width: `${estado?.porcentaje ?? 0}%` }} />
            </div>
            <p className="texto-cuerpo text-[var(--color-texto)]">
              {estado?.etapa_actual ?? "Esperando el inicio de la importación."}
            </p>
          </div>
        </div>

        {mensaje ? (
          <div className="banda-estado">
            <p className="texto-cuerpo text-[var(--color-texto)]">{mensaje}</p>
          </div>
        ) : null}
      </section>

      <section className="grid gap-6 border-b border-[var(--color-borde-suave)] pb-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-3">
          <p className="titulo-seccion text-[var(--color-acento)]">
            Etapas
          </p>
          <ol className="space-y-3">
            {ETAPAS.map((etapa, indice) => {
              const activa = estado?.etapa_actual?.startsWith(etapa) ?? false;
              const completada = (estado?.porcentaje ?? 0) >= ((indice + 1) / ETAPAS.length) * 100;
              return (
                <li key={etapa} className="flex items-center gap-3 border-b border-[var(--color-borde-suave)] pb-3">
                  <span
                    className={
                      completada
                        ? "estado-linea estado-linea-ok"
                        : activa
                          ? "estado-linea estado-linea-alerta"
                          : "estado-linea"
                    }
                  >
                    {indice + 1}
                  </span>
                  <span className="texto-cuerpo text-[var(--color-texto)]">{etapa}</span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="titulo-seccion text-[var(--color-acento)]">Procesados</p>
            <p className="numero-metrica mt-2">{estado?.total_procesado ?? 0}</p>
          </div>
          <div>
            <p className="titulo-seccion text-[var(--color-acento)]">Creados</p>
            <p className="numero-metrica mt-2">{estado?.creados ?? 0}</p>
          </div>
          <div>
            <p className="titulo-seccion text-[var(--color-acento)]">Actualizados</p>
            <p className="numero-metrica mt-2">{estado?.actualizados ?? 0}</p>
          </div>
          <div>
            <p className="titulo-seccion text-[var(--color-acento)]">Errores</p>
            <p className="numero-metrica mt-2">{estado?.errores ?? 0}</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <p className="titulo-seccion text-[var(--color-acento)]">
          Resultado por tabla
        </p>

        <div className="overflow-x-auto">
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
                    Aún no hay resultados disponibles.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {estado?.advertencias.length ? (
          <div className="space-y-2 border-t border-[var(--color-borde-suave)] pt-4">
            <p className="titulo-seccion text-[var(--color-alerta)]">
              Advertencias
            </p>
            <ul className="space-y-2 texto-ayuda">
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
