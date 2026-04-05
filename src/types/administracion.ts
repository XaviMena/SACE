import type { EstadoUsuario, RolUsuario, UsuarioApp } from "@/types/auth";
import type { Docente } from "@/types/docentes";

export interface SolicitudAccesoDocente {
  solicitud_id: string;
  uid: string;
  correo: string;
  cedula: string;
  nombres: string;
  estado: EstadoUsuario;
  creado_en: string;
  ultimo_acceso: string;
  persona_id_referencia: string;
  docente_encontrado: boolean;
  docente?: Partial<Docente> | null;
}

export interface ResumenTablaImportacion {
  tabla: string;
  etiqueta: string;
  procesados: number;
  creados: number;
  actualizados: number;
  omitidos: number;
  errores: number;
  advertencias: string[];
}

export interface EstadoImportacionAdmin {
  job_id: string;
  estado: "pendiente" | "ejecutando" | "completado" | "error";
  etapa_actual: string;
  porcentaje: number;
  total_procesado: number;
  creados: number;
  actualizados: number;
  omitidos: number;
  errores: number;
  advertencias: string[];
  tablas: ResumenTablaImportacion[];
  finalizado_en?: string;
  error_mensaje?: string;
}

export interface ContextoAdminCliente {
  usuario: UsuarioApp;
}

export interface DocenteConUsuario extends Docente {
  rol_usuario: Extract<RolUsuario, "admin" | "docente" | "autoridad" | "dece"> | null;
  usuario_uid: string | null;
  acceso_vinculado: boolean;
  rol_editable: boolean;
}
