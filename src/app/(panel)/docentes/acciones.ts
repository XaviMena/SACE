"use server";

import { revalidatePath } from "next/cache";
import { crear_docente } from "@/lib/repositorios/docentes";
import {
  esquemaFormularioDocente,
  type ValoresFormularioDocente,
} from "@/lib/validaciones/identidad";

export interface EstadoAccionDocente {
  ok: boolean;
  mensaje: string;
  errores?: Partial<Record<keyof ValoresFormularioDocente, string>>;
}

export async function crear_docente_accion(
  valores: ValoresFormularioDocente,
): Promise<EstadoAccionDocente> {
  const validacion = esquemaFormularioDocente.safeParse(valores);

  if (!validacion.success) {
    const errores = validacion.error.flatten().fieldErrors;

    return {
      ok: false,
      mensaje: "Corrige los campos marcados para continuar.",
      errores: {
        cedula: errores.cedula?.[0],
        nombres_apellidos: errores.nombres_apellidos?.[0],
        correo: errores.correo?.[0],
        telefono: errores.telefono?.[0],
        estado_registro: errores.estado_registro?.[0],
        activo: errores.activo?.[0],
      },
    };
  }

  try {
    await crear_docente(validacion.data);
    revalidatePath("/docentes");
    revalidatePath("/dashboard");

    return {
      ok: true,
      mensaje: "Docente registrado correctamente en la base operativa semilla.",
    };
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "No se pudo registrar el docente.";

    return {
      ok: false,
      mensaje,
    };
  }
}
