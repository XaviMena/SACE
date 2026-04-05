"use client";

import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { Boton } from "@/components/ui/boton";
import type { DocenteConUsuario } from "@/types/administracion";
import type { RolUsuario } from "@/types/auth";

const ETIQUETAS_ROL: Record<Extract<RolUsuario, "admin" | "docente" | "autoridad" | "dece">, string> = {
  admin: "Administrador",
  docente: "Docente",
  autoridad: "Autoridad",
  dece: "DECE",
};

export function TablaDocentes({
  datos,
  esAdmin,
  docenteRolPendiente,
  rolesSeleccionados,
  onSeleccionarRol,
  onCambiarRol,
}: {
  datos: DocenteConUsuario[];
  esAdmin: boolean;
  docenteRolPendiente: string | null;
  rolesSeleccionados: Partial<Record<string, Extract<RolUsuario, "admin" | "docente" | "autoridad" | "dece">>>;
  onSeleccionarRol: (docenteId: string, rol: Extract<RolUsuario, "admin" | "docente" | "autoridad" | "dece">) => void;
  onCambiarRol: (docente: DocenteConUsuario, rol: Extract<RolUsuario, "admin" | "docente" | "autoridad" | "dece">) => void;
}) {
  const columnas: ColumnDef<DocenteConUsuario>[] = [
    {
      accessorKey: "nombres_apellidos",
      header: "Docente",
    },
    {
      accessorKey: "cedula",
      header: "Cédula",
    },
    {
      accessorKey: "correo",
      header: "Correo",
    },
    {
      accessorKey: "rol_usuario",
      header: "Rol de acceso",
      cell: ({ row }) => {
        const docente = row.original;
        const rolActual = docente.rol_usuario ?? "docente";

        const estilo =
          rolActual === "admin"
            ? "bg-[rgba(27,97,118,0.10)] text-[var(--color-acento)]"
            : rolActual === "autoridad"
              ? "bg-[rgba(142,97,25,0.14)] text-[var(--color-alerta)]"
              : rolActual === "dece"
                ? "bg-[rgba(128,74,182,0.12)] text-[rgb(112,64,160)]"
                : "bg-[rgba(31,122,79,0.10)] text-[var(--color-exito)]";

        return (
          <span className={`inline-flex rounded-full px-3 py-1 text-[var(--tamano-ui)] font-medium capitalize ${estilo}`}>
            {ETIQUETAS_ROL[rolActual]}
          </span>
        );
      },
    },
  ];

  if (esAdmin) {
    columnas.push({
      id: "acciones",
      header: "Acción",
      cell: ({ row }) => {
        const docente = row.original;
        const cambiando = docenteRolPendiente === docente.docente_id;
        const rolSeleccionado = rolesSeleccionados[docente.docente_id] ?? docente.rol_usuario ?? "docente";
        const rolActual = docente.rol_usuario ?? "docente";

        return (
          <div className="flex items-center gap-2">
            <select
              className="min-w-[9.5rem] appearance-none bg-transparent px-0 py-2 text-[var(--tamano-ui)] font-medium text-[var(--color-texto)] outline-none transition hover:text-[var(--color-acento)] focus:text-[var(--color-acento)]"
              value={rolSeleccionado}
              onChange={(evento) =>
                onSeleccionarRol(
                  docente.docente_id,
                  evento.target.value as Extract<RolUsuario, "admin" | "docente" | "autoridad" | "dece">,
                )
              }
              disabled={cambiando}
            >
              <option value="docente">Docente</option>
              <option value="autoridad">Autoridad</option>
              <option value="dece">DECE</option>
              <option value="admin">Administrador</option>
            </select>
            <Boton
              type="button"
              variante="fantasma"
              onClick={() => onCambiarRol(docente, rolSeleccionado)}
              disabled={cambiando || rolSeleccionado === rolActual}
            >
              {cambiando ? "Guardando..." : "Guardar"}
            </Boton>
          </div>
        );
      },
    });
  }

  // TanStack Table expone una API conocida como incompatible con React Compiler.
  // La usamos aquí de forma controlada en un componente de tabla no memoizado.
  // eslint-disable-next-line react-hooks/incompatible-library
  const tabla = useReactTable({
    data: datos,
    columns: columnas,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-[var(--color-borde-suave)]">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-[var(--color-superficie-secundaria)]">
            {tabla.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-4 text-left text-[var(--tamano-ui)] font-medium text-[var(--color-texto-suave)]"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-[var(--color-superficie)]">
            {tabla.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t border-[var(--color-borde-suave)]">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-4 text-[var(--tamano-ui)] text-[var(--color-texto)]">
                    {cell.column.columnDef.cell
                      ? flexRender(cell.column.columnDef.cell, cell.getContext())
                      : String(cell.getValue() ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
