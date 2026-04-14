import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  CalendarCheck,
  ClipboardList,
  Database,
  FileBarChart2,
  FolderCog,
  GraduationCap,
  KeyRound,
  LayoutGrid,
  UserCheck,
  Users,
} from "lucide-react";
import type { RolUsuario } from "@/types/auth";

export type GrupoMenuPanel =
  | "comunidad"
  | "oferta_academica"
  | "operacion_lectiva"
  | "evaluacion_asistencia"
  | "datos_integracion"
  | "reportes"
  | "administracion";

export interface ItemMenuPanel {
  grupo: GrupoMenuPanel | "dashboard" | "personal";
  etiqueta: string;
  href: string | null;
  icono: LucideIcon;
  rolesPermitidos?: RolUsuario[];
  visibleSiExisteRuta: boolean;
  esPersonal?: boolean;
  visibleParaAdminSiempre?: boolean;
}

export interface GrupoMenuConfig {
  id: GrupoMenuPanel;
  etiqueta: string;
}

export const GRUPOS_MENU_PANEL: GrupoMenuConfig[] = [
  { id: "comunidad", etiqueta: "Comunidad" },
  { id: "oferta_academica", etiqueta: "Oferta académica" },
  { id: "operacion_lectiva", etiqueta: "Operación lectiva" },
  { id: "evaluacion_asistencia", etiqueta: "Evaluación y asistencia" },
  { id: "datos_integracion", etiqueta: "Datos e integración" },
  { id: "reportes", etiqueta: "Reportes" },
  { id: "administracion", etiqueta: "Administración" },
];

export const ITEMS_MENU_PANEL: ItemMenuPanel[] = [
  {
    grupo: "dashboard",
    etiqueta: "Dashboard",
    href: "/dashboard",
    icono: LayoutGrid,
    visibleSiExisteRuta: true,
  },
  {
    grupo: "comunidad",
    etiqueta: "Docentes",
    href: null,
    icono: Users,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "comunidad",
    etiqueta: "Estudiantes",
    href: null,
    icono: GraduationCap,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "comunidad",
    etiqueta: "Campeonato interno",
    href: null,
    icono: CalendarCheck,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "oferta_academica",
    etiqueta: "Niveles de educación",
    href: null,
    icono: BookOpen,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "oferta_academica",
    etiqueta: "Grados y cursos",
    href: null,
    icono: BookOpen,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "oferta_academica",
    etiqueta: "Paralelos",
    href: null,
    icono: BookOpen,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "oferta_academica",
    etiqueta: "Asignaturas",
    href: null,
    icono: BookOpen,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "oferta_academica",
    etiqueta: "Malla curricular",
    href: null,
    icono: BookOpen,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "operacion_lectiva",
    etiqueta: "Distributivo / asignación de carga",
    href: null,
    icono: ClipboardList,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "operacion_lectiva",
    etiqueta: "Comisiones y actividades",
    href: null,
    icono: ClipboardList,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "operacion_lectiva",
    etiqueta: "Horarios",
    href: null,
    icono: CalendarCheck,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "operacion_lectiva",
    etiqueta: "Año lectivo",
    href: null,
    icono: CalendarCheck,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "operacion_lectiva",
    etiqueta: "Depuración de duplicados",
    href: null,
    icono: FolderCog,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "evaluacion_asistencia",
    etiqueta: "Horario y asistencia",
    href: null,
    icono: CalendarCheck,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "evaluacion_asistencia",
    etiqueta: "Evaluaciones",
    href: null,
    icono: ClipboardList,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "evaluacion_asistencia",
    etiqueta: "Grupos de trabajo",
    href: null,
    icono: Users,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "evaluacion_asistencia",
    etiqueta: "Actividades de tutoría",
    href: null,
    icono: ClipboardList,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "evaluacion_asistencia",
    etiqueta: "Sorteo",
    href: null,
    icono: CalendarCheck,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "evaluacion_asistencia",
    etiqueta: "Crucigrama",
    href: null,
    icono: ClipboardList,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "evaluacion_asistencia",
    etiqueta: "Sopa de letras",
    href: null,
    icono: ClipboardList,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "datos_integracion",
    etiqueta: "Importar nómina de docentes",
    href: null,
    icono: Database,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "datos_integracion",
    etiqueta: "Importar estructura",
    href: null,
    icono: Database,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "datos_integracion",
    etiqueta: "Sincronizar malla curricular",
    href: null,
    icono: Database,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "datos_integracion",
    etiqueta: "Importar distributivo",
    href: null,
    icono: Database,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "datos_integracion",
    etiqueta: "Migración de optativas",
    href: null,
    icono: Database,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "datos_integracion",
    etiqueta: "Importar aforo de cupos",
    href: null,
    icono: Database,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "datos_integracion",
    etiqueta: "Descargar listas CAS",
    href: null,
    icono: Database,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "datos_integracion",
    etiqueta: "Importar listas de estudiantes",
    href: null,
    icono: Database,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "datos_integracion",
    etiqueta: "Imp/Exp representantes",
    href: null,
    icono: Database,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "datos_integracion",
    etiqueta: "Exportar",
    href: null,
    icono: Database,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "reportes",
    etiqueta: "Estadísticas",
    href: null,
    icono: FileBarChart2,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "reportes",
    etiqueta: "Oficios de notificación",
    href: null,
    icono: FileBarChart2,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "reportes",
    etiqueta: "Reportes de carga horaria",
    href: null,
    icono: FileBarChart2,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "reportes",
    etiqueta: "Estadísticas docentes",
    href: null,
    icono: FileBarChart2,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "reportes",
    etiqueta: "Tutores de grado/curso",
    href: null,
    icono: FileBarChart2,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "reportes",
    etiqueta: "Listas de estudiantes",
    href: null,
    icono: FileBarChart2,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "reportes",
    etiqueta: "Cuadro de honor",
    href: null,
    icono: FileBarChart2,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "reportes",
    etiqueta: "Mensajes WhatsApp",
    href: null,
    icono: FileBarChart2,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "reportes",
    etiqueta: "Imprimir matrícula",
    href: null,
    icono: FileBarChart2,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "reportes",
    etiqueta: "Reporte de calificaciones",
    href: null,
    icono: FileBarChart2,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "administracion",
    etiqueta: "Cambio de rol",
    href: "/docentes",
    icono: Users,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: true,
  },
  {
    grupo: "administracion",
    etiqueta: "Aprobaciones",
    href: "/administracion/aprobaciones",
    icono: UserCheck,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: true,
  },
  {
    grupo: "administracion",
    etiqueta: "Importación",
    href: "/administracion/importacion",
    icono: Database,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: true,
  },
  {
    grupo: "administracion",
    etiqueta: "Auditoría del sistema",
    href: null,
    icono: FolderCog,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "administracion",
    etiqueta: "Gestión de backups",
    href: null,
    icono: FolderCog,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "administracion",
    etiqueta: "Inicializar periodo / base de datos",
    href: null,
    icono: FolderCog,
    rolesPermitidos: ["admin"],
    visibleSiExisteRuta: false,
    visibleParaAdminSiempre: true,
  },
  {
    grupo: "personal",
    etiqueta: "Cambiar contraseña",
    href: "/configuracion/clave",
    icono: KeyRound,
    visibleSiExisteRuta: true,
    esPersonal: true,
  },
];

export function item_menu_visible(item: ItemMenuPanel, rol: RolUsuario | null) {
  if (rol === "admin" && item.visibleParaAdminSiempre) {
    return true;
  }

  if (!item.visibleSiExisteRuta) {
    return false;
  }

  if (!item.rolesPermitidos?.length) {
    return true;
  }

  return rol ? item.rolesPermitidos.includes(rol) : false;
}

export function ruta_esta_activa(pathname: string, href: string | null) {
  if (!href) {
    return false;
  }

  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
