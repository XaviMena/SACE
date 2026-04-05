"use client";

import { useDeferredValue, useEffect, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { TablaDocentes } from "@/components/data-table/tabla-docentes";
import { EstadoVacio } from "@/components/feedback/estado-vacio";
import { useSesion } from "@/lib/auth/proveedor-sesion";
import type { DocenteConUsuario } from "@/types/administracion";
import type { RolUsuario } from "@/types/auth";

interface EstadoAccionDocente {
  ok: boolean;
  mensaje: string;
}

const estadoInicial: EstadoAccionDocente = {
  ok: false,
  mensaje: "",
};

export function ModuloDocentes({
  docentes,
  onRecargar,
}: {
  docentes: DocenteConUsuario[];
  onRecargar: () => Promise<void>;
}) {
  const { usuario } = useSesion();
  const [docentesLocales, setDocentesLocales] = useState(docentes);
  const [busqueda, setBusqueda] = useState("");
  const [estadoAccion, setEstadoAccion] = useState<EstadoAccionDocente>(estadoInicial);
  const [docenteRolPendiente, setDocenteRolPendiente] = useState<string | null>(null);
  const [rolesSeleccionados, setRolesSeleccionados] = useState<
    Partial<Record<string, Extract<RolUsuario, "admin" | "docente" | "autoridad" | "dece">>>
  >({});
  const [, startTransition] = useTransition();
  const busquedaDiferida = useDeferredValue(busqueda);
  const esAdmin = usuario?.rol === "admin";

  useEffect(() => {
    setDocentesLocales(docentes);
    setRolesSeleccionados(
      Object.fromEntries(
        docentes
          .filter(
            (docente): docente is DocenteConUsuario & {
              rol_usuario: Extract<RolUsuario, "admin" | "docente" | "autoridad" | "dece">;
            } => Boolean(docente.rol_usuario),
          )
          .map((docente) => [docente.docente_id, docente.rol_usuario]),
      ),
    );
  }, [docentes]);

  const termino = busquedaDiferida.trim().toLowerCase();
  const docentesVinculados = docentesLocales.filter((docente) => docente.acceso_vinculado && docente.rol_editable);
  const docentesFiltrados = docentesVinculados.filter((docente) => {
    if (!termino) {
      return true;
    }

    return (
      docente.nombres_apellidos.toLowerCase().includes(termino) ||
      docente.cedula.includes(termino) ||
      docente.correo.toLowerCase().includes(termino)
    );
  });

  const cambiarRol = (
    docente: DocenteConUsuario,
    rolDestino: Extract<RolUsuario, "admin" | "docente" | "autoridad" | "dece">,
  ) => {
    setEstadoAccion(estadoInicial);
    setDocenteRolPendiente(docente.docente_id);

    startTransition(async () => {
      try {
        if (!usuario) {
          throw new Error("No se pudo identificar la sesión administrativa.");
        }

        const respuesta = await fetch(`/api/administracion/docentes/${docente.docente_id}/rol`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-sace-uid": usuario.uid,
          },
          body: JSON.stringify({ rol: rolDestino }),
        });
        const datos = (await respuesta.json()) as { ok?: boolean; mensaje?: string };

        if (!respuesta.ok || datos.ok === false) {
          throw new Error(datos.mensaje ?? "No se pudo actualizar el rol del docente.");
        }

        await onRecargar();
        setEstadoAccion({
          ok: true,
          mensaje: datos.mensaje ?? "El rol del docente fue actualizado correctamente.",
        });
      } catch (error) {
        setEstadoAccion({
          ok: false,
          mensaje: error instanceof Error ? error.message : "No se pudo actualizar el rol del docente.",
        });
      } finally {
        setDocenteRolPendiente(null);
      }
    });
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4 border-b border-[var(--color-borde-suave)] pb-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="titulo-seccion text-[var(--color-acento)]">Accesos vinculados</p>
            <p className="texto-cuerpo texto-suave">
              Solo se muestran docentes que ya tienen un usuario institucional listo para cambiar de rol.
            </p>
          </div>

          <label className="relative w-full md:max-w-sm" htmlFor="busqueda-docente-rol">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[var(--color-texto-suave)]" />
            <input
              id="busqueda-docente-rol"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              className="w-full rounded-2xl border border-[var(--color-borde)] bg-[var(--color-superficie)] py-3 pr-4 pl-11 text-[var(--tamano-ui)] outline-none transition placeholder:text-[var(--color-texto-suave)] focus:border-[var(--color-acento)] focus:ring-3 focus:ring-[rgba(22,93,115,0.15)]"
              placeholder="Buscar por nombre, cédula o correo"
            />
          </label>
        </div>

        {estadoAccion.mensaje ? (
          <div
            className={
              estadoAccion.ok
                ? "rounded-2xl border border-[rgba(31,122,79,0.16)] bg-[rgba(31,122,79,0.08)] px-4 py-3 text-[var(--tamano-ui)] text-[var(--color-exito)]"
                : "rounded-2xl border border-[rgba(181,66,45,0.14)] bg-[rgba(181,66,45,0.07)] px-4 py-3 text-[var(--tamano-ui)] text-[var(--color-peligro)]"
            }
          >
            {estadoAccion.mensaje}
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        {docentesVinculados.length === 0 ? (
          <EstadoVacio
            titulo="No hay docentes con acceso vinculado"
            descripcion="Primero el docente debe tener acceso aprobado para que aquí puedas cambiar su rol."
          />
        ) : docentesFiltrados.length === 0 ? (
          <EstadoVacio
            titulo="No encontramos coincidencias"
            descripcion="Prueba con otro nombre, cédula o correo para ubicar el acceso que quieres ajustar."
          />
        ) : (
          <TablaDocentes
            datos={docentesFiltrados}
            esAdmin={esAdmin}
            docenteRolPendiente={docenteRolPendiente}
            rolesSeleccionados={rolesSeleccionados}
            onSeleccionarRol={(docenteId, rol) =>
              setRolesSeleccionados((actual) => ({
                ...actual,
                [docenteId]: rol,
              }))
            }
            onCambiarRol={cambiarRol}
          />
        )}
      </section>
    </div>
  );
}
