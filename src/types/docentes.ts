export type EstadoRegistroDocente = "activo" | "pendiente_registro" | "bloqueado";

export interface Docente {
  docente_id: string;
  cedula: string;
  nombres_apellidos: string;
  correo: string;
  telefono: string;
  activo: boolean;
  usuario_uid: string | null;
  estado_registro: EstadoRegistroDocente;
}
