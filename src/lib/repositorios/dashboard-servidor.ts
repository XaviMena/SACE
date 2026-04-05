import "server-only";

import type { UsuarioApp } from "@/types/auth";
import { obtenerFirebaseAdmin } from "@/lib/firebase/admin";
import { docentesSemilla, usuarioAdminSemilla, usuariosSemilla } from "@/lib/repositorios/datos-semilla";
import { ordenar_por_criterio_institucional } from "@/lib/utils/ordenamiento";

export interface ResumenDashboardAdmin {
  periodo_activo: string | null;
  docentes: number;
  estudiantes: number;
  asignaciones: number;
  solicitudes_pendientes: number;
  fuente: "firebase" | "simulado";
}

export interface ItemDistributivoDocente {
  asignacion_id: string;
  asignatura: string;
  paralelo: string;
  jornada: string | null;
  horas_asignadas: number;
}

export interface DashboardPerfil {
  es_admin: boolean;
  tiene_perfil_docente: boolean;
}

export interface DashboardPayload {
  perfil: DashboardPerfil;
  resumen_admin: ResumenDashboardAdmin | null;
  distributivo_docente: {
    docente_id: string;
    nombre: string;
    total_asignaciones: number;
    total_horas: number;
    items: ItemDistributivoDocente[];
  } | null;
}

async function obtener_periodo_activo(firebase: NonNullable<ReturnType<typeof obtenerFirebaseAdmin>>) {
  const periodoActivoSnapshot = await firebase.db
    .collection("periodos")
    .where("estado", "==", "activo")
    .limit(1)
    .get();

  return periodoActivoSnapshot.docs[0]?.data() as { periodo_id?: string; nombre?: string } | undefined;
}

export async function obtener_resumen_dashboard_admin(): Promise<ResumenDashboardAdmin> {
  const firebase = obtenerFirebaseAdmin();

  if (!firebase) {
    return {
      periodo_activo: "Periodo Lectivo 2025 - 2026",
      docentes: docentesSemilla.length,
      estudiantes: 0,
      asignaciones: 2,
      solicitudes_pendientes: usuariosSemilla.filter(
        (usuario) => usuario.rol === "docente" && usuario.estado === "pendiente_registro",
      ).length,
      fuente: "simulado",
    };
  }

  const periodoActivo = await obtener_periodo_activo(firebase);
  const periodoId = periodoActivo?.periodo_id ?? null;

  const [docentesCount, estudiantesCount, solicitudesCount, asignacionesCount] = await Promise.all([
    firebase.db.collection("docentes").count().get(),
    firebase.db.collection("estudiantes").count().get(),
    firebase.db
      .collection("usuarios")
      .where("rol", "==", "docente")
      .where("estado", "==", "pendiente_registro")
      .count()
      .get(),
    periodoId
      ? firebase.db
          .collection("asignaciones_docentes")
          .where("periodo_id", "==", periodoId)
          .count()
          .get()
      : firebase.db.collection("asignaciones_docentes").count().get(),
  ]);

  return {
    periodo_activo: periodoActivo?.nombre ?? "Sin periodo activo configurado",
    docentes: docentesCount.data().count,
    estudiantes: estudiantesCount.data().count,
    asignaciones: asignacionesCount.data().count,
    solicitudes_pendientes: solicitudesCount.data().count,
    fuente: "firebase",
  };
}

async function obtener_distributivo_docente_servidor(docenteId: string) {
  const firebase = obtenerFirebaseAdmin();

  if (!firebase) {
    const items = [
      {
        asignacion_id: "ad-001",
        asignatura: "Lengua y Literatura",
        paralelo: "3 BGU A",
        jornada: "Matutina",
        horas_asignadas: 10,
      },
    ].filter(() => docenteId === usuarioAdminSemilla.persona_id_referencia);

    const docente = docentesSemilla.find((item) => item.docente_id === docenteId) ?? null;

    if (!docente) {
      return null;
    }

    return {
      docente_id: docente.docente_id,
      nombre: docente.nombres_apellidos,
      total_asignaciones: items.length,
      total_horas: items.reduce((total, item) => total + item.horas_asignadas, 0),
      items,
    };
  }

  const docenteSnapshot = await firebase.db.collection("docentes").doc(docenteId).get();

  if (!docenteSnapshot.exists) {
    return null;
  }

  const periodoActivo = await obtener_periodo_activo(firebase);
  const periodoId = periodoActivo?.periodo_id ?? null;

  const asignacionesQuery = periodoId
    ? firebase.db
        .collection("asignaciones_docentes")
        .where("periodo_id", "==", periodoId)
        .where("docente_id", "==", docenteId)
    : firebase.db.collection("asignaciones_docentes").where("docente_id", "==", docenteId);

  const asignacionesSnapshot = await asignacionesQuery.get();

  if (asignacionesSnapshot.empty) {
    return {
      docente_id: docenteId,
      nombre: String(docenteSnapshot.data()?.nombres_apellidos ?? "Docente"),
      total_asignaciones: 0,
      total_horas: 0,
      items: [],
    };
  }

  const asignaciones = asignacionesSnapshot.docs.map((documento) => ({
    asignacion_id: documento.id,
    ...(documento.data() as {
      asignacion_id?: string;
      asignatura_id?: string;
      paralelo_id?: string;
      horas_asignadas?: number;
    }),
  }));

  const idsAsignaturas = [...new Set(asignaciones.map((item) => String(item.asignatura_id ?? "")).filter(Boolean))];
  const idsParalelos = [...new Set(asignaciones.map((item) => String(item.paralelo_id ?? "")).filter(Boolean))];

  const referenciasAsignaturas = idsAsignaturas.map((id) => firebase.db.collection("asignaturas").doc(id));
  const referenciasParalelos = idsParalelos.map((id) => firebase.db.collection("paralelos").doc(id));

  const [asignaturasSnapshot, paralelosSnapshot] = await Promise.all([
    referenciasAsignaturas.length ? firebase.db.getAll(...referenciasAsignaturas) : Promise.resolve([]),
    referenciasParalelos.length ? firebase.db.getAll(...referenciasParalelos) : Promise.resolve([]),
  ]);

  const mapaAsignaturas = new Map(
    asignaturasSnapshot.map((doc) => [doc.id, String(doc.data()?.nombre ?? doc.data()?.nombre_asignatura ?? doc.id)]),
  );
  const mapaParalelos = new Map(
    paralelosSnapshot.map((doc) => [
      doc.id,
      {
        nombre: String(doc.data()?.nombre_paralelo ?? doc.id),
        jornada: doc.data()?.jornada ? String(doc.data()?.jornada) : null,
        grado_curso_id: doc.data()?.grado_curso_id ? String(doc.data()?.grado_curso_id) : null,
      },
    ]),
  );

  const idsGrados = [
    ...new Set(
      paralelosSnapshot
        .map((doc) => doc.data()?.grado_curso_id)
        .filter((valor): valor is string | number => valor !== null && valor !== undefined)
        .map((valor) => String(valor)),
    ),
  ];
  const referenciasGrados = idsGrados.map((id) => firebase.db.collection("grados_cursos").doc(id));
  const gradosSnapshot = referenciasGrados.length ? await firebase.db.getAll(...referenciasGrados) : [];
  const mapaGrados = new Map(
    gradosSnapshot.map((doc) => [doc.id, String(doc.data()?.nombre ?? doc.data()?.nombre_grado_curso ?? doc.id)]),
  );

  const items = asignaciones.map<ItemDistributivoDocente>((item) => {
    const paralelo = mapaParalelos.get(String(item.paralelo_id ?? ""));
    const nombreGrado = paralelo?.grado_curso_id ? mapaGrados.get(paralelo.grado_curso_id) ?? paralelo.grado_curso_id : null;

    return {
      asignacion_id: String(item.asignacion_id ?? item.asignacion_id),
      asignatura: mapaAsignaturas.get(String(item.asignatura_id ?? "")) ?? String(item.asignatura_id ?? "Asignatura"),
      paralelo: [nombreGrado, paralelo?.nombre].filter(Boolean).join(" ") || String(item.paralelo_id ?? "Paralelo"),
      jornada: paralelo?.jornada ?? null,
      horas_asignadas: Number(item.horas_asignadas ?? 0),
    };
  });

  const itemsOrdenados = ordenar_por_criterio_institucional(items, (item) => {
    const partes = item.paralelo.trim().split(/\s+/);
    const paralelo = partes.at(-1) ?? "";
    const grado = partes.slice(0, -1).join(" ");

    return {
      jornada: item.jornada ?? "",
      grado,
      paralelo,
    };
  });

  return {
    docente_id: docenteId,
    nombre: String(docenteSnapshot.data()?.nombres_apellidos ?? "Docente"),
    total_asignaciones: itemsOrdenados.length,
    total_horas: itemsOrdenados.reduce((total, item) => total + item.horas_asignadas, 0),
    items: itemsOrdenados,
  };
}

export async function obtener_dashboard_por_usuario(usuario: UsuarioApp): Promise<DashboardPayload> {
  const resumenAdmin = usuario.rol === "admin" ? await obtener_resumen_dashboard_admin() : null;
  const distributivo = await obtener_distributivo_docente_servidor(usuario.persona_id_referencia);

  return {
    perfil: {
      es_admin: usuario.rol === "admin",
      tiene_perfil_docente: Boolean(distributivo),
    },
    resumen_admin: resumenAdmin,
    distributivo_docente: distributivo,
  };
}

export function es_admin_semilla(uid: string) {
  return uid === usuarioAdminSemilla.uid;
}
