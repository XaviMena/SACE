import initSqlJs, { type Database, type QueryExecResult } from "sql.js";
import { obtenerFirebaseAdmin } from "@/lib/firebase/admin";
import { buscar_documento_por_campo_servidor, upsert_documentos_servidor } from "@/lib/repositorios/usuarios-servidor";
import { normalizar_cedula, normalizar_correo, normalizar_telefono_ec } from "@/lib/validaciones/identidad";
import { agregar_resumen_tabla, actualizar_estado_importacion, finalizar_estado_importacion, marcar_error_importacion } from "@/lib/importaciones/estado-importacion";
import { usuarioAdminSemilla } from "@/lib/repositorios/datos-semilla";
import type { ResumenTablaImportacion } from "@/types/administracion";
import type { UsuarioApp } from "@/types/auth";
import type { Docente } from "@/types/docentes";

type ValorSqlite = string | number | Uint8Array | null;
type FilaSqlite = Record<string, ValorSqlite>;

const ETAPAS = [
  "Validación del archivo",
  "Lectura del esquema",
  "Importación de catálogos",
  "Importación de personas",
  "Importación de relaciones académicas",
  "Finalización",
] as const;

const PORCENTAJES = {
  validacion: 8,
  esquema: 16,
  catalogos_inicio: 17,
  catalogos_fin: 44,
  personas_inicio: 45,
  personas_fin: 72,
  relaciones_inicio: 73,
  relaciones_fin: 92,
  finalizacion: 100,
} as const;

const TAMANO_LOTE_IMPORTACION = 200;

function partir_nombres(nombresApellidos: string) {
  const limpio = nombresApellidos.trim().replace(/\s+/g, " ");
  const partes = limpio.split(" ");

  if (partes.length <= 2) {
    return {
      nombres: limpio,
      apellidos: "",
    };
  }

  return {
    apellidos: partes.slice(0, 2).join(" "),
    nombres: partes.slice(2).join(" "),
  };
}

function a_booleano(valor: unknown) {
  if (typeof valor === "number") {
    return valor === 1;
  }

  if (typeof valor === "string") {
    return ["1", "si", "sí", "true", "activo", "yes", "y", "no", "0"].includes(valor.toLowerCase()) ? ["1", "si", "sí", "true", "activo", "yes", "y"].includes(valor.toLowerCase()) : Boolean(valor);
  }

  return Boolean(valor);
}

function a_iso(valor: unknown) {
  if (!valor) {
    return null;
  }

  if (typeof valor !== "string") {
    return String(valor);
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(valor)) {
    return valor;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) {
    const [dia, mes, anio] = valor.split("/");
    return `${anio}-${mes}-${dia}`;
  }

  return valor;
}

function a_filas(resultado?: QueryExecResult): FilaSqlite[] {
  if (!resultado || !resultado.columns || !resultado.values) {
    return [];
  }

  return resultado.values.map((fila: ValorSqlite[]) =>
    Object.fromEntries(resultado.columns.map((columna: string, indice: number) => [columna, fila[indice] ?? null])),
  );
}

function ejecutar_consulta(db: Database, sql: string) {
  return a_filas(db.exec(sql)[0]);
}

async function docente_existe_por_correo(correo: string) {
  return (await buscar_documento_por_campo_servidor("usuarios", "correo", correo)) as UsuarioApp | null;
}

async function importar_tabla<T extends FilaSqlite>(jobId: string, config: {
  tabla: string;
  etiqueta: string;
  filas: T[];
  etapa: string;
  porcentaje_inicio: number;
  porcentaje_fin: number;
  mapear: (fila: T) => Promise<{ coleccion: string; id: string; datos: Record<string, unknown> } | null>;
}) {
  const resumen: ResumenTablaImportacion = {
    tabla: config.tabla,
    etiqueta: config.etiqueta,
    procesados: 0,
    creados: 0,
    actualizados: 0,
    omitidos: 0,
    errores: 0,
    advertencias: [],
  };

  const total = config.filas.length;

  if (total === 0) {
    agregar_resumen_tabla(jobId, resumen);
    actualizar_estado_importacion(jobId, {
      etapa_actual: `${config.etapa} · ${config.etiqueta} (sin registros)`,
      porcentaje: config.porcentaje_fin,
    });
    return resumen;
  }

  const calcular_porcentaje = (procesados: number) => {
    const avance = procesados / total;
    return Math.min(
      config.porcentaje_fin,
      Math.round(config.porcentaje_inicio + (config.porcentaje_fin - config.porcentaje_inicio) * avance),
    );
  };

  for (let indice = 0; indice < config.filas.length; indice += TAMANO_LOTE_IMPORTACION) {
    const lote = config.filas.slice(indice, indice + TAMANO_LOTE_IMPORTACION);
    const documentosPorColeccion = new Map<string, Array<{ id: string; datos: Record<string, unknown> }>>();

    for (const fila of lote) {
      resumen.procesados += 1;

      try {
        const documento = await config.mapear(fila);

        if (!documento) {
          resumen.omitidos += 1;
          continue;
        }

        const acumulado = documentosPorColeccion.get(documento.coleccion) ?? [];
        acumulado.push({ id: documento.id, datos: documento.datos });
        documentosPorColeccion.set(documento.coleccion, acumulado);
      } catch (error) {
        resumen.errores += 1;
        resumen.advertencias.push(
          `Fila omitida en ${config.etiqueta}: ${error instanceof Error ? error.message : "Error desconocido."}`,
        );
      }
    }

    for (const [coleccion, documentos] of documentosPorColeccion) {
      const resultado = await upsert_documentos_servidor(coleccion, documentos);
      resumen.creados += resultado.creados;
      resumen.actualizados += resultado.actualizados;
    }

    agregar_resumen_tabla(jobId, {
      ...resumen,
      advertencias: [...new Set(resumen.advertencias)].slice(0, 30),
    });

    const porcentaje = calcular_porcentaje(resumen.procesados);
    const detalle = `${config.etapa} · ${config.etiqueta} (${resumen.procesados}/${total})`;

    actualizar_estado_importacion(jobId, {
      etapa_actual: detalle,
      porcentaje,
    });

    console.info(`[importacion:${jobId}] ${detalle} | creados=${resumen.creados} actualizados=${resumen.actualizados} omitidos=${resumen.omitidos} errores=${resumen.errores}`);
  }

  agregar_resumen_tabla(jobId, {
    ...resumen,
    advertencias: [...new Set(resumen.advertencias)].slice(0, 30),
  });

  return resumen;
}

export async function ejecutar_importacion_sqlite(jobId: string, archivo: Uint8Array) {
  try {
    if (!obtenerFirebaseAdmin()) {
      throw new Error("Firebase Admin no está configurado en el servidor.");
    }

    actualizar_estado_importacion(jobId, {
      estado: "ejecutando",
      etapa_actual: ETAPAS[0],
      porcentaje: PORCENTAJES.validacion,
    });

    const SQL = await initSqlJs({
      locateFile: (file: string) => `${process.cwd()}/node_modules/sql.js/dist/${file}`,
    });

    const sqlite = new SQL.Database(archivo);
    actualizar_estado_importacion(jobId, {
      etapa_actual: ETAPAS[1],
      porcentaje: PORCENTAJES.esquema,
    });

    const tablasExistentes = ejecutar_consulta(
      sqlite,
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    ).map((fila) => String(fila.name));

    const tablasRequeridas = [
      "PeriodosLectivos",
      "NivelesEducacion",
      "GradosCursos",
      "Paralelos",
      "Asignaturas",
      "Docentes",
      "Estudiantes",
      "AsignacionesDocentes",
    ];

    for (const tabla of tablasRequeridas) {
      if (!tablasExistentes.includes(tabla)) {
        throw new Error(`La tabla requerida ${tabla} no existe en el archivo SQLite.`);
      }
    }

    actualizar_estado_importacion(jobId, {
      etapa_actual: ETAPAS[2],
      porcentaje: PORCENTAJES.catalogos_inicio,
    });

    const periodos = ejecutar_consulta(sqlite, "SELECT * FROM PeriodosLectivos");
    const niveles = ejecutar_consulta(sqlite, "SELECT * FROM NivelesEducacion");
    const grados = ejecutar_consulta(sqlite, "SELECT * FROM GradosCursos");
    const asignaturas = ejecutar_consulta(sqlite, "SELECT * FROM Asignaturas");
    const paralelos = ejecutar_consulta(sqlite, "SELECT * FROM Paralelos");
    const malla = tablasExistentes.includes("CurriculoHorarioEstandar")
      ? ejecutar_consulta(sqlite, "SELECT * FROM CurriculoHorarioEstandar")
      : [];

    await importar_tabla(jobId, {
      tabla: "PeriodosLectivos",
      etiqueta: "Periodos lectivos",
      filas: periodos,
      etapa: ETAPAS[2],
      porcentaje_inicio: PORCENTAJES.catalogos_inicio,
      porcentaje_fin: 20,
      mapear: async (fila) => ({
        coleccion: "periodos",
        id: String(fila.periodo_id),
        datos: {
          periodo_id: String(fila.periodo_id),
          nombre: fila.nombre,
          fecha_inicio: a_iso(fila.fecha_inicio),
          fecha_fin: a_iso(fila.fecha_fin),
          estado: String(fila.estado ?? "activo").toLowerCase(),
        },
      }),
    });

    await importar_tabla(jobId, {
      tabla: "NivelesEducacion",
      etiqueta: "Niveles",
      filas: niveles,
      etapa: ETAPAS[2],
      porcentaje_inicio: 20,
      porcentaje_fin: 24,
      mapear: async (fila) => ({
        coleccion: "niveles",
        id: String(fila.nivel_id),
        datos: {
          nivel_id: String(fila.nivel_id),
          nombre: fila.nombre_nivel,
        },
      }),
    });

    await importar_tabla(jobId, {
      tabla: "GradosCursos",
      etiqueta: "Grados y cursos",
      filas: grados,
      etapa: ETAPAS[2],
      porcentaje_inicio: 24,
      porcentaje_fin: 29,
      mapear: async (fila) => ({
        coleccion: "grados_cursos",
        id: String(fila.grado_curso_id),
        datos: {
          grado_curso_id: String(fila.grado_curso_id),
          nivel_id: String(fila.nivel_id),
          nombre: fila.nombre_grado_curso,
          tipo_bachillerato: fila.tipo_bachillerato ?? "",
        },
      }),
    });

    await importar_tabla(jobId, {
      tabla: "Asignaturas",
      etiqueta: "Asignaturas",
      filas: asignaturas,
      etapa: ETAPAS[2],
      porcentaje_inicio: 29,
      porcentaje_fin: 34,
      mapear: async (fila) => ({
        coleccion: "asignaturas",
        id: String(fila.asignatura_id),
        datos: {
          asignatura_id: String(fila.asignatura_id),
          nombre: fila.nombre_asignatura,
          es_modulo_tecnico: a_booleano(fila.es_modulo_tecnico),
        },
      }),
    });

    await importar_tabla(jobId, {
      tabla: "Paralelos",
      etiqueta: "Paralelos",
      filas: paralelos,
      etapa: ETAPAS[2],
      porcentaje_inicio: 34,
      porcentaje_fin: 39,
      mapear: async (fila) => ({
        coleccion: "paralelos",
        id: String(fila.paralelo_id),
        datos: {
          paralelo_id: String(fila.paralelo_id),
          periodo_id: String(fila.periodo_id),
          grado_curso_id: String(fila.grado_curso_id),
          nombre_paralelo: fila.nombre_paralelo,
          jornada: fila.jornada,
          numero_estudiantes: Number(fila.numero_estudiantes ?? 0),
          aforo: Number(fila.aforo ?? 0),
          tutor_id: fila.tutor_id ? String(fila.tutor_id) : null,
        },
      }),
    });

    await importar_tabla(jobId, {
      tabla: "CurriculoHorarioEstandar",
      etiqueta: "Malla curricular",
      filas: malla,
      etapa: ETAPAS[2],
      porcentaje_inicio: 39,
      porcentaje_fin: PORCENTAJES.catalogos_fin,
      mapear: async (fila) => ({
        coleccion: "malla_curricular",
        id: `${fila.periodo_id}-${fila.grado_curso_id}-${fila.asignatura_id}`,
        datos: {
          curriculo_id: String(fila.curriculo_id),
          periodo_id: String(fila.periodo_id),
          grado_curso_id: String(fila.grado_curso_id),
          asignatura_id: String(fila.asignatura_id),
          horas_semanales: Number(fila.horas_semanales ?? 0),
        },
      }),
    });

    actualizar_estado_importacion(jobId, {
      etapa_actual: ETAPAS[3],
      porcentaje: PORCENTAJES.personas_inicio,
    });

    const docentes = ejecutar_consulta(sqlite, "SELECT * FROM Docentes");
    const estudiantes = ejecutar_consulta(sqlite, "SELECT * FROM Estudiantes");
    const representantes = tablasExistentes.includes("Representantes")
      ? ejecutar_consulta(sqlite, "SELECT * FROM Representantes")
      : [];

    await importar_tabla(jobId, {
      tabla: "Docentes",
      etiqueta: "Docentes",
      filas: docentes,
      etapa: ETAPAS[3],
      porcentaje_inicio: PORCENTAJES.personas_inicio,
      porcentaje_fin: 50,
      mapear: async (fila) => {
        const cedula = normalizar_cedula(String(fila.cedula ?? fila.docente_id ?? ""));
        const docenteId = normalizar_cedula(String(fila.docente_id ?? cedula));
        const correo = fila.correo ? normalizar_correo(String(fila.correo)) : "";
        const telefono = fila.telefono ? normalizar_telefono_ec(String(fila.telefono)) : "0000000000";
        const docente: Docente = {
          docente_id: docenteId,
          cedula: cedula || docenteId,
          nombres_apellidos: String(fila.nombres_apellidos ?? fila.nombre ?? "SIN NOMBRE").trim().toUpperCase(),
          correo,
          telefono: telefono.length === 10 ? telefono : "0000000000",
          activo: a_booleano(fila.esta_en_ie ?? 1),
          usuario_uid: correo ? `importado-docente-${docenteId}` : null,
          estado_registro: "pendiente_registro",
        };

        return {
          coleccion: "docentes",
          id: docenteId,
          datos: {
            ...docente,
            metadatos_importacion: {
              nivel_educacion: fila.nivel_educacion ?? null,
              titulo_3er_nivel: fila.titulo_3er_nivel ?? null,
              titulo_4to_nivel: fila.titulo_4to_nivel ?? null,
              especialidad_accion_personal: fila.especialidad_accion_personal ?? null,
              especialidad_requerida: fila.especialidad_requerida ?? null,
              grupo_etnico: fila.grupo_etnico ?? null,
              nacionalidad_indigena: fila.nacionalidad_indigena ?? null,
              relacion_laboral: fila.relacion_laboral ?? null,
              funcion_cargo: fila.funcion_cargo ?? null,
              categoria: fila.categoria ?? null,
              fecha_nacimiento: a_iso(fila.fecha_nacimiento),
              fecha_ingreso_magisterio: a_iso(fila.fecha_ingreso_magisterio),
              fecha_ingreso_ie: a_iso(fila.fecha_ingreso_ie),
              observacion: fila.observacion ?? null,
              sexo: fila.sexo ?? null,
            },
          },
        };
      },
    });

    await importar_tabla(jobId, {
      tabla: "UsuariosDocentes",
      etiqueta: "Usuarios docentes",
      filas: docentes,
      etapa: ETAPAS[3],
      porcentaje_inicio: 50,
      porcentaje_fin: 53,
      mapear: async (fila) => {
        const cedula = normalizar_cedula(String(fila.cedula ?? fila.docente_id ?? ""));
        const docenteId = normalizar_cedula(String(fila.docente_id ?? cedula));
        const correo = fila.correo ? normalizar_correo(String(fila.correo)) : "";

        if (!correo) {
          return null;
        }

        const telefono = fila.telefono ? normalizar_telefono_ec(String(fila.telefono)) : "0000000000";
        const nombres = partir_nombres(String(fila.nombres_apellidos ?? fila.nombre ?? ""));
        const existentePorCorreo = await docente_existe_por_correo(correo);

        const usuario: UsuarioApp = {
          uid: existentePorCorreo?.uid ?? `importado-docente-${docenteId}`,
          correo,
          rol: correo === usuarioAdminSemilla.correo ? "admin" : "docente",
          estado: correo === usuarioAdminSemilla.correo ? "activo" : "pendiente_registro",
          cedula: cedula || docenteId,
          telefono: telefono.length === 10 ? telefono : "0000000000",
          nombres: nombres.nombres || String(fila.nombres_apellidos ?? ""),
          apellidos: nombres.apellidos,
          persona_id_referencia: docenteId,
          creado_en: existentePorCorreo?.creado_en ?? new Date().toISOString(),
          ultimo_acceso: existentePorCorreo?.ultimo_acceso ?? new Date().toISOString(),
        };

        return {
          coleccion: "usuarios",
          id: usuario.uid,
          datos: { ...usuario } as Record<string, unknown>,
        };
      },
    });

    await importar_tabla(jobId, {
      tabla: "Estudiantes",
      etiqueta: "Estudiantes",
      filas: estudiantes,
      etapa: ETAPAS[3],
      porcentaje_inicio: 53,
      porcentaje_fin: 64,
      mapear: async (fila) => ({
        coleccion: "estudiantes",
        id: String(fila.estudiante_id),
        datos: {
          estudiante_id: String(fila.estudiante_id),
          cedula: normalizar_cedula(String(fila.cedula ?? fila.estudiante_id ?? "")),
          apellidos_nombres: String(fila.apellidos_nombres ?? "").trim().toUpperCase(),
          correo_institucional: fila.correo_institucional ? normalizar_correo(String(fila.correo_institucional)) : null,
          fecha_nacimiento: a_iso(fila.fecha_nacimiento),
          celular: fila.celular ? normalizar_telefono_ec(String(fila.celular)) : null,
          tipo_conectividad: fila.tipo_conectividad ?? null,
          etnia: fila.etnia ?? null,
          direccion: fila.direccion ?? null,
          discapacidad_flag: a_booleano(fila.discapacidad_flag),
          tipo_discapacidad: fila.tipo_discapacidad ?? null,
          observacion: fila.observacion ?? null,
          sexo: fila.sexo ?? null,
          con_quien_vive: fila.ConQuienVive ?? null,
          activo: a_booleano(fila.activo ?? 1),
          retirado: a_booleano(fila.retirado ?? 0),
        },
      }),
    });

    await importar_tabla(jobId, {
      tabla: "Representantes",
      etiqueta: "Representantes",
      filas: representantes,
      etapa: ETAPAS[3],
      porcentaje_inicio: 64,
      porcentaje_fin: PORCENTAJES.personas_fin,
      mapear: async (fila) => ({
        coleccion: "representantes",
        id: String(fila.representante_id),
        datos: {
          representante_id: String(fila.representante_id),
          nombre: fila.representante ?? null,
          cedula: fila.cedula_representante ? normalizar_cedula(String(fila.cedula_representante)) : null,
          parentesco: fila.parentesco ?? null,
          telefono: fila.telefono_representante ? normalizar_telefono_ec(String(fila.telefono_representante)) : null,
          correo: fila.email_representante ? normalizar_correo(String(fila.email_representante)) : null,
          direccion: fila.direccion_representante ?? null,
        },
      }),
    });

    actualizar_estado_importacion(jobId, {
      etapa_actual: ETAPAS[4],
      porcentaje: PORCENTAJES.relaciones_inicio,
    });

    const asignaciones = ejecutar_consulta(sqlite, "SELECT * FROM AsignacionesDocentes");
    const estudianteParalelo = tablasExistentes.includes("EstudianteParalelo")
      ? ejecutar_consulta(sqlite, "SELECT * FROM EstudianteParalelo")
      : [];
    const estudianteRepresentante = tablasExistentes.includes("EstudianteRepresentante")
      ? ejecutar_consulta(sqlite, "SELECT * FROM EstudianteRepresentante")
      : [];

    await importar_tabla(jobId, {
      tabla: "AsignacionesDocentes",
      etiqueta: "Asignaciones docentes",
      filas: asignaciones,
      etapa: ETAPAS[4],
      porcentaje_inicio: PORCENTAJES.relaciones_inicio,
      porcentaje_fin: 78,
      mapear: async (fila) => ({
        coleccion: "asignaciones_docentes",
        id: String(fila.asignacion_id),
        datos: {
          asignacion_id: String(fila.asignacion_id),
          periodo_id: String(fila.periodo_id),
          docente_id: normalizar_cedula(String(fila.docente_id)),
          asignatura_id: String(fila.asignatura_id),
          paralelo_id: String(fila.paralelo_id),
          horas_asignadas: Number(fila.horas_asignadas ?? 0),
        },
      }),
    });

    await importar_tabla(jobId, {
      tabla: "EstudianteParalelo",
      etiqueta: "Asignación estudiante-paralelo",
      filas: estudianteParalelo,
      etapa: ETAPAS[4],
      porcentaje_inicio: 78,
      porcentaje_fin: 86,
      mapear: async (fila) => ({
        coleccion: "estudiante_paralelos",
        id: `${fila.periodo_id}-${fila.estudiante_id}-${fila.paralelo_id}`,
        datos: {
          periodo_id: String(fila.periodo_id),
          estudiante_id: String(fila.estudiante_id),
          paralelo_id: String(fila.paralelo_id),
          estado: fila.estado ?? "activo",
          fecha_asignacion: a_iso(fila.fecha_asignacion),
          fecha_baja: a_iso(fila.fecha_baja),
        },
      }),
    });

    await importar_tabla(jobId, {
      tabla: "EstudianteRepresentante",
      etiqueta: "Relación estudiante-representante",
      filas: estudianteRepresentante,
      etapa: ETAPAS[4],
      porcentaje_inicio: 86,
      porcentaje_fin: PORCENTAJES.relaciones_fin,
      mapear: async (fila) => ({
        coleccion: "estudiante_representantes",
        id: `${fila.estudiante_id}-${fila.cedula_representante}`,
        datos: {
          estudiante_id: String(fila.estudiante_id),
          cedula_representante: normalizar_cedula(String(fila.cedula_representante)),
          relacion: fila.relacion ?? null,
          es_principal: a_booleano(fila.es_principal),
          vigente: a_booleano(fila.vigente),
        },
      }),
    });

    actualizar_estado_importacion(jobId, {
      etapa_actual: ETAPAS[5],
      porcentaje: PORCENTAJES.finalizacion,
    });

    finalizar_estado_importacion(jobId);
  } catch (error) {
    marcar_error_importacion(jobId, error instanceof Error ? error.message : "No se pudo importar el archivo SQLite.");
  }
}
