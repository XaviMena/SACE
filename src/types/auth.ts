export type RolUsuario = "admin" | "docente" | "autoridad" | "dece" | "padre" | "estudiante";
export type EstadoUsuario = "activo" | "pendiente_registro" | "bloqueado";

export interface UsuarioApp {
  uid: string;
  correo: string;
  rol: RolUsuario;
  estado: EstadoUsuario;
  clave_acceso?: string | null;
  cedula: string;
  telefono: string;
  nombres: string;
  apellidos: string;
  persona_id_referencia: string;
  creado_en: string;
  ultimo_acceso: string;
}
