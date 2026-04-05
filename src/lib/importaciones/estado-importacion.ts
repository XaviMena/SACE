import type { EstadoImportacionAdmin, ResumenTablaImportacion } from "@/types/administracion";

const trabajos = new Map<string, EstadoImportacionAdmin>();

export function crear_estado_importacion(jobId: string) {
  const estado: EstadoImportacionAdmin = {
    job_id: jobId,
    estado: "pendiente",
    etapa_actual: "Preparando importación",
    porcentaje: 0,
    total_procesado: 0,
    creados: 0,
    actualizados: 0,
    omitidos: 0,
    errores: 0,
    advertencias: [],
    tablas: [],
  };

  trabajos.set(jobId, estado);
  return estado;
}

export function obtener_estado_importacion(jobId: string) {
  return trabajos.get(jobId) ?? null;
}

export function actualizar_estado_importacion(jobId: string, cambios: Partial<EstadoImportacionAdmin>) {
  const actual = trabajos.get(jobId);

  if (!actual) {
    return null;
  }

  const actualizado = {
    ...actual,
    ...cambios,
  } satisfies EstadoImportacionAdmin;

  trabajos.set(jobId, actualizado);
  return actualizado;
}

export function agregar_resumen_tabla(jobId: string, resumen: ResumenTablaImportacion) {
  const actual = trabajos.get(jobId);

  if (!actual) {
    return null;
  }

  const tablas = [...actual.tablas.filter((item) => item.tabla !== resumen.tabla), resumen];
  const actualizado = {
    ...actual,
    tablas,
    total_procesado: tablas.reduce((total, item) => total + item.procesados, 0),
    creados: tablas.reduce((total, item) => total + item.creados, 0),
    actualizados: tablas.reduce((total, item) => total + item.actualizados, 0),
    omitidos: tablas.reduce((total, item) => total + item.omitidos, 0),
    errores: tablas.reduce((total, item) => total + item.errores, 0),
    advertencias: [...new Set(tablas.flatMap((item) => item.advertencias))],
  } satisfies EstadoImportacionAdmin;

  trabajos.set(jobId, actualizado);
  return actualizado;
}

export function finalizar_estado_importacion(jobId: string, cambios?: Partial<EstadoImportacionAdmin>) {
  return actualizar_estado_importacion(jobId, {
    estado: "completado",
    porcentaje: 100,
    etapa_actual: "Importación completada",
    finalizado_en: new Date().toISOString(),
    ...cambios,
  });
}

export function marcar_error_importacion(jobId: string, error: string) {
  return actualizar_estado_importacion(jobId, {
    estado: "error",
    error_mensaje: error,
    etapa_actual: "Importación con error",
    finalizado_en: new Date().toISOString(),
  });
}
