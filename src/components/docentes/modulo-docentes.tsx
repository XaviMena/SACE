"use client";

import { useDeferredValue, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search, UserPlus } from "lucide-react";
import { BarraFiltros } from "@/components/layout/barra-filtros";
import { EncabezadoPagina } from "@/components/layout/encabezado-pagina";
import { TablaDocentes } from "@/components/data-table/tabla-docentes";
import { EstadoVacio } from "@/components/feedback/estado-vacio";
import { Boton } from "@/components/ui/boton";
import { Campo } from "@/components/ui/campo";
import { crear_docente } from "@/lib/repositorios/docentes";
import {
  esquemaFormularioDocente,
  type ValoresFormularioDocente,
} from "@/lib/validaciones/identidad";
import type { Docente, EstadoRegistroDocente } from "@/types/docentes";

interface EstadoAccionDocente {
  ok: boolean;
  mensaje: string;
}

const estadoInicial: EstadoAccionDocente = {
  ok: false,
  mensaje: "",
};

const opcionesEstado: { valor: EstadoRegistroDocente | "todos"; etiqueta: string }[] = [
  { valor: "todos", etiqueta: "Todos" },
  { valor: "pendiente_registro", etiqueta: "Pendientes" },
  { valor: "activo", etiqueta: "Activos" },
  { valor: "bloqueado", etiqueta: "Bloqueados" },
];

export function ModuloDocentes({ docentes }: { docentes: Docente[] }) {
  const [docentesLocales, setDocentesLocales] = useState(docentes);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoRegistroDocente | "todos">("todos");
  const [busqueda, setBusqueda] = useState("");
  const [estadoAccion, setEstadoAccion] = useState<EstadoAccionDocente>(estadoInicial);
  const [estaPendiente, startTransition] = useTransition();
  const busquedaDiferida = useDeferredValue(busqueda);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ValoresFormularioDocente>({
    resolver: zodResolver(esquemaFormularioDocente),
    defaultValues: {
      cedula: "",
      nombres_apellidos: "",
      correo: "",
      telefono: "",
      estado_registro: "pendiente_registro",
      activo: true,
    },
  });

  const termino = busquedaDiferida.trim().toLowerCase();
  const docentesFiltrados = docentesLocales.filter((docente) => {
    const coincideEstado = estadoFiltro === "todos" || docente.estado_registro === estadoFiltro;
    const coincideBusqueda =
      termino.length === 0 ||
      docente.nombres_apellidos.toLowerCase().includes(termino) ||
      docente.cedula.includes(termino) ||
      docente.correo.toLowerCase().includes(termino);

    return coincideEstado && coincideBusqueda;
  });

  const onSubmit = handleSubmit((valores) => {
    setEstadoAccion(estadoInicial);

    startTransition(async () => {
      try {
        const nuevoDocente = await crear_docente(valores);

        setDocentesLocales((actuales) => [nuevoDocente, ...actuales]);
        setEstadoAccion({
          ok: true,
          mensaje: "Docente registrado correctamente en la base institucional.",
        });
        reset();
        setMostrarFormulario(false);
      } catch (error) {
        const mensaje = error instanceof Error ? error.message : "No se pudo registrar el docente.";

        if (mensaje.toLowerCase().includes("cédula")) {
          setError("cedula", { type: "server", message: mensaje });
        }

        if (mensaje.toLowerCase().includes("correo")) {
          setError("correo", { type: "server", message: mensaje });
        }

        setEstadoAccion({
          ok: false,
          mensaje,
        });
      }
    });
  });

  return (
    <div className="space-y-8">
      <EncabezadoPagina
        titulo="Docentes"
        descripcion="Registro y consulta de docentes."
        acciones={
          <Boton type="button" onClick={() => setMostrarFormulario((valor) => !valor)}>
            <UserPlus className="mr-2 size-4" />
            {mostrarFormulario ? "Cerrar alta" : "Nuevo docente"}
          </Boton>
        }
      />

      {mostrarFormulario ? (
        <section className="superficie rounded-[1.5rem] px-5 py-6">
          <div className="mb-5 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-acento)]">
              Alta docente
            </p>
          </div>

          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Campo
                etiqueta="Cédula"
                id="cedula"
                inputMode="numeric"
                maxLength={10}
                placeholder="0201305406"
                error={errors.cedula?.message}
                ayuda="Si llega con 9 dígitos, se normaliza con 0 inicial."
                {...register("cedula")}
              />
              <Campo
                etiqueta="Nombres y apellidos"
                id="nombres_apellidos"
                placeholder="APELLIDOS NOMBRES"
                error={errors.nombres_apellidos?.message}
                {...register("nombres_apellidos")}
              />
              <Campo
                etiqueta="Correo institucional"
                id="correo"
                type="email"
                placeholder="docente@educacion.gob.ec"
                error={errors.correo?.message}
                {...register("correo")}
              />
              <Campo
                etiqueta="Teléfono"
                id="telefono"
                inputMode="numeric"
                maxLength={10}
                placeholder="0999999999"
                error={errors.telefono?.message}
                ayuda="Debe ser un número ecuatoriano de 10 dígitos."
                {...register("telefono")}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
              <label className="flex flex-col gap-2 text-sm text-[var(--color-texto)]" htmlFor="estado_registro">
                <span className="font-semibold">Estado de registro</span>
                <select
                  id="estado_registro"
                  className="rounded-2xl border border-[var(--color-borde)] bg-[var(--color-superficie)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-acento)] focus:ring-3 focus:ring-[rgba(22,93,115,0.15)]"
                  {...register("estado_registro")}
                >
                  <option value="pendiente_registro">Pendiente de registro</option>
                  <option value="activo">Activo</option>
                  <option value="bloqueado">Bloqueado</option>
                </select>
                {errors.estado_registro?.message ? (
                  <span className="text-sm text-[var(--color-peligro)]">{errors.estado_registro.message}</span>
                ) : (
                  <span className="text-sm texto-suave">Controla el estado operativo inicial del perfil.</span>
                )}
              </label>

              <div className="flex flex-col justify-between gap-4 rounded-[1.25rem] border border-[var(--color-borde-suave)] px-4 py-4 md:flex-row md:items-center">
                <label className="flex items-start gap-3 text-sm text-[var(--color-texto)]" htmlFor="activo">
                  <input
                    id="activo"
                    type="checkbox"
                    className="mt-1 size-4 rounded border-[var(--color-borde)] text-[var(--color-acento)]"
                    {...register("activo")}
                  />
                  <span>
                    <span className="block font-semibold">Docente activo</span>
                    <span className="block texto-suave">
                      Mantiene al docente visible para asignaciones y carga operativa.
                    </span>
                  </span>
                </label>

                <div className="flex flex-wrap gap-3">
                  <Boton type="button" variante="fantasma" onClick={() => setMostrarFormulario(false)}>
                    Cancelar
                  </Boton>
                  <Boton type="submit" disabled={estaPendiente}>
                    {estaPendiente ? "Guardando..." : "Guardar docente"}
                  </Boton>
                </div>
              </div>
            </div>

            {estadoAccion.mensaje ? (
              <div
                className={
                  estadoAccion.ok
                    ? "rounded-2xl border border-[rgba(31,122,79,0.16)] bg-[rgba(31,122,79,0.08)] px-4 py-3 text-sm text-[var(--color-exito)]"
                    : "rounded-2xl border border-[rgba(181,66,45,0.14)] bg-[rgba(181,66,45,0.07)] px-4 py-3 text-sm text-[var(--color-peligro)]"
                }
              >
                {estadoAccion.mensaje}
              </div>
            ) : null}
          </form>
        </section>
      ) : null}

      <BarraFiltros>
        <div className="space-y-2">
          <p className="text-sm font-semibold">Búsqueda y estado</p>
          <p className="text-sm texto-suave">
            Filtra por nombre, cédula o correo y enfoca la operación sobre el estado real del registro docente.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 md:w-auto md:min-w-[32rem] md:flex-row md:items-center md:justify-end">
          <label className="relative w-full md:max-w-sm" htmlFor="busqueda-docente">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[var(--color-texto-suave)]" />
            <input
              id="busqueda-docente"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              className="w-full rounded-2xl border border-[var(--color-borde)] bg-[var(--color-superficie)] py-3 pr-4 pl-11 text-sm outline-none transition placeholder:text-[var(--color-texto-suave)] focus:border-[var(--color-acento)] focus:ring-3 focus:ring-[rgba(22,93,115,0.15)]"
              placeholder="Buscar por nombre, cédula o correo"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {opcionesEstado.map((opcion) => (
              <Boton
                key={opcion.valor}
                type="button"
                variante={estadoFiltro === opcion.valor ? "secundaria" : "fantasma"}
                onClick={() => setEstadoFiltro(opcion.valor)}
              >
                {opcion.etiqueta}
              </Boton>
            ))}
          </div>
        </div>
      </BarraFiltros>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="texto-suave">
            {docentesFiltrados.length} docentes visibles de {docentesLocales.length} registrados.
          </p>
          <p className="texto-suave">
            Activos: {docentesLocales.filter((docente) => docente.estado_registro === "activo").length} |
            Pendientes: {docentesLocales.filter((docente) => docente.estado_registro === "pendiente_registro").length}
          </p>
        </div>

        {docentesFiltrados.length === 0 ? (
          <EstadoVacio
            titulo="No hay docentes para los filtros actuales"
            descripcion="Ajusta la búsqueda o registra un nuevo docente para poblar la base operativa."
          />
        ) : (
          <TablaDocentes datos={docentesFiltrados} />
        )}
      </section>
    </div>
  );
}
