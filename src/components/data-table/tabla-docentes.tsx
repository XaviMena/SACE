"use client";

import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import type { Docente } from "@/types/docentes";

const columnas: ColumnDef<Docente>[] = [
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
    accessorKey: "telefono",
    header: "Teléfono",
  },
  {
    accessorKey: "estado_registro",
    header: "Estado",
    cell: ({ row }) => {
      const valor = row.original.estado_registro;
      const mapaColor =
        valor === "activo"
          ? "bg-[rgba(31,122,79,0.10)] text-[var(--color-exito)]"
          : valor === "bloqueado"
            ? "bg-[rgba(181,66,45,0.10)] text-[var(--color-peligro)]"
            : "bg-[rgba(183,121,31,0.12)] text-[var(--color-alerta)]";

      return (
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${mapaColor}`}>
          {valor.replace("_", " ")}
        </span>
      );
    },
  },
];

export function TablaDocentes({ datos }: { datos: Docente[] }) {
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
                    className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-texto-suave)]"
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
                  <td key={cell.id} className="px-4 py-4 text-sm text-[var(--color-texto)]">
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
