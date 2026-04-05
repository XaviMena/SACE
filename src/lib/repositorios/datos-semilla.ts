import type { Docente } from "@/types/docentes";
import type { UsuarioApp } from "@/types/auth";

const marcaTiempo = new Date().toISOString();

export const usuarioAdminSemilla: UsuarioApp = {
  uid: "admin-0201305406",
  correo: "xavymena@gmail.com",
  rol: "admin",
  estado: "activo",
  clave_acceso: null,
  cedula: "0201305406",
  telefono: "0999999999",
  nombres: "Fernando Xavier",
  apellidos: "Mena Paredes",
  persona_id_referencia: "0201305406",
  creado_en: marcaTiempo,
  ultimo_acceso: marcaTiempo,
};

export const usuariosSemilla: UsuarioApp[] = [
  usuarioAdminSemilla,
  {
    uid: "solicitud-0201114246",
    correo: "maclovia.aguilar@educacion.gob.ec",
    rol: "docente",
    estado: "pendiente_registro",
    clave_acceso: null,
    cedula: "0201114246",
    telefono: "0987654321",
    nombres: "MACLOVIA ISABEL",
    apellidos: "AGUILAR BARRAGAN",
    persona_id_referencia: "0201114246",
    creado_en: marcaTiempo,
    ultimo_acceso: marcaTiempo,
  },
];

export const docentesSemilla: Docente[] = [
  {
    docente_id: "0201305406",
    cedula: "0201305406",
    nombres_apellidos: "MENA PAREDES FERNANDO XAVIER",
    correo: "xavymena@gmail.com",
    telefono: "0999999999",
    activo: true,
    usuario_uid: usuarioAdminSemilla.uid,
    estado_registro: "activo",
  },
  {
    docente_id: "0201114246",
    cedula: "0201114246",
    nombres_apellidos: "AGUILAR BARRAGÁN MACLOVIA ISABEL",
    correo: "maclovia.aguilar@educacion.gob.ec",
    telefono: "0987654321",
    activo: true,
    usuario_uid: null,
    estado_registro: "pendiente_registro",
  },
  {
    docente_id: "0201598554",
    cedula: "0201598554",
    nombres_apellidos: "BARRAGÁN VELASCO GUILLERMO BOLÍVAR",
    correo: "guillermo.barragan@educacion.gob.ec",
    telefono: "0976543210",
    activo: true,
    usuario_uid: null,
    estado_registro: "pendiente_registro",
  },
];
