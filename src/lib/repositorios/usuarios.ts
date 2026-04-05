import type { UsuarioApp } from "@/types/auth";
import { usuarioAdminSemilla, usuariosSemilla } from "@/lib/repositorios/datos-semilla";
import { obtenerFirebaseBase } from "@/lib/firebase/cliente";
import { firebaseConfigurado } from "@/lib/firebase/config";
import { normalizar_correo } from "@/lib/validaciones/identidad";
import { actualizar_estado_docente } from "@/lib/repositorios/docentes";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import type { SolicitudAccesoDocente } from "@/types/administracion";

let baseUsuarios = [...usuariosSemilla];

export async function obtener_usuario_por_uid(uid: string) {
  if (!firebaseConfigurado()) {
    const usuario = baseUsuarios.find((item) => item.uid === uid) ?? null;
    return Promise.resolve(usuario satisfies UsuarioApp | null);
  }

  const firebase = obtenerFirebaseBase();

  if (!firebase) {
    return Promise.resolve(null);
  }

  const referencia = doc(firebase.db, "usuarios", uid);
  const instantanea = await getDoc(referencia);

  if (!instantanea.exists()) {
    return null;
  }

  return instantanea.data() as UsuarioApp;
}

export async function obtener_usuario_actual_mock() {
  return Promise.resolve(usuarioAdminSemilla);
}

export async function obtener_rol_actual() {
  return Promise.resolve(usuarioAdminSemilla.rol);
}

export async function obtener_usuario_por_correo(correo: string) {
  if (!firebaseConfigurado()) {
    const correoNormalizado = normalizar_correo(correo);
    return Promise.resolve(baseUsuarios.find((item) => item.correo === correoNormalizado) ?? null);
  }

  const firebase = obtenerFirebaseBase();

  if (!firebase) {
    return null;
  }

  const correoNormalizado = normalizar_correo(correo);
  const consulta = query(
    collection(firebase.db, "usuarios"),
    where("correo", "==", correoNormalizado),
    limit(1),
  );
  const resultado = await getDocs(consulta);
  const documento = resultado.docs[0];

  return documento ? ((documento.data() as UsuarioApp) satisfies UsuarioApp) : null;
}

export async function resolver_usuario_autenticado(uid: string, correo: string) {
  if (!firebaseConfigurado()) {
    const correoNormalizado = normalizar_correo(correo);
    const usuario = baseUsuarios.find(
      (item) => item.uid === uid || item.correo === correoNormalizado,
    );

    if (!usuario) {
      return null;
    }

    const usuarioSincronizado = {
      ...usuario,
      uid,
      correo: correoNormalizado,
      ultimo_acceso: new Date().toISOString(),
    } satisfies UsuarioApp;

    baseUsuarios = [
      usuarioSincronizado,
      ...baseUsuarios.filter((item) => item.uid !== usuario.uid && item.correo !== correoNormalizado),
    ];

    return usuarioSincronizado;
  }

  const firebase = obtenerFirebaseBase();

  if (!firebase) {
    return null;
  }

  const correoNormalizado = normalizar_correo(correo);
  const referenciaActual = doc(firebase.db, "usuarios", uid);
  const usuarioActual = await getDoc(referenciaActual);
  const marcaTiempo = new Date().toISOString();

  if (usuarioActual.exists()) {
    await updateDoc(referenciaActual, {
      correo: correoNormalizado,
      ultimo_acceso: marcaTiempo,
    });

    await sincronizar_docente_vinculado(uid, usuarioActual.data() as UsuarioApp);

    return {
      ...(usuarioActual.data() as UsuarioApp),
      correo: correoNormalizado,
      ultimo_acceso: marcaTiempo,
    } satisfies UsuarioApp;
  }

  const usuarioPorCorreo = await obtener_usuario_por_correo(correoNormalizado);

  if (!usuarioPorCorreo) {
    return null;
  }

  const usuarioSincronizado: UsuarioApp = {
    ...usuarioPorCorreo,
    uid,
    correo: correoNormalizado,
    ultimo_acceso: marcaTiempo,
  };

  await setDoc(referenciaActual, usuarioSincronizado);

  if (usuarioPorCorreo.uid !== uid) {
    await deleteDoc(doc(firebase.db, "usuarios", usuarioPorCorreo.uid));
  }

  await sincronizar_docente_vinculado(uid, usuarioSincronizado);

  return usuarioSincronizado;
}

async function sincronizar_docente_vinculado(uid: string, usuario: UsuarioApp) {
  const firebase = obtenerFirebaseBase();

  if (!firebase) {
    return;
  }

  const referenciaDocente = doc(firebase.db, "docentes", usuario.persona_id_referencia);
  const docente = await getDoc(referenciaDocente);

  if (!docente.exists()) {
    return;
  }

  await updateDoc(referenciaDocente, {
    usuario_uid: uid,
    correo: usuario.correo,
    telefono: usuario.telefono,
  });
}

export async function registrar_ultimo_acceso_usuario(uid: string, correo: string) {
  if (!firebaseConfigurado()) {
    const usuario = baseUsuarios.find((item) => item.uid === uid) ?? null;

    if (!usuario) {
      return null;
    }

    const actualizado = {
      ...usuario,
      correo: normalizar_correo(correo),
      ultimo_acceso: new Date().toISOString(),
    } satisfies UsuarioApp;

    baseUsuarios = [actualizado, ...baseUsuarios.filter((item) => item.uid !== uid)];

    return actualizado;
  }

  const firebase = obtenerFirebaseBase();

  if (!firebase) {
    return null;
  }

  const referencia = doc(firebase.db, "usuarios", uid);
  const instantanea = await getDoc(referencia);

  if (!instantanea.exists()) {
    return null;
  }

  const correoNormalizado = normalizar_correo(correo);
  const ultimo_acceso = new Date().toISOString();

  await updateDoc(referencia, {
    correo: correoNormalizado,
    ultimo_acceso,
  });

  const usuario = {
    ...(instantanea.data() as UsuarioApp),
    correo: correoNormalizado,
    ultimo_acceso,
  } satisfies UsuarioApp;

  await sincronizar_docente_vinculado(uid, usuario);

  return usuario;
}

export async function guardar_usuario(usuario: UsuarioApp) {
  if (!firebaseConfigurado()) {
    baseUsuarios = [usuario, ...baseUsuarios.filter((item) => item.uid !== usuario.uid)];
    return usuario;
  }

  const firebase = obtenerFirebaseBase();

  if (!firebase) {
    return usuario;
  }

  await setDoc(doc(firebase.db, "usuarios", usuario.uid), usuario);
  return usuario;
}

export async function listar_solicitudes_acceso_docentes(): Promise<SolicitudAccesoDocente[]> {
  if (!firebaseConfigurado()) {
    const solicitudes = baseUsuarios
      .filter((usuario) => usuario.rol === "docente" && usuario.estado === "pendiente_registro")
      .map<SolicitudAccesoDocente>((usuario) => ({
        solicitud_id: usuario.uid,
        uid: usuario.uid,
        correo: usuario.correo,
        cedula: usuario.cedula,
        nombres: `${usuario.apellidos} ${usuario.nombres}`.trim(),
        estado: usuario.estado,
        creado_en: usuario.creado_en,
        ultimo_acceso: usuario.ultimo_acceso,
        persona_id_referencia: usuario.persona_id_referencia,
        docente_encontrado: true,
      }));

    return Promise.resolve(solicitudes);
  }

  const firebase = obtenerFirebaseBase();

  if (!firebase) {
    return Promise.resolve([] as SolicitudAccesoDocente[]);
  }

  const consulta = query(
    collection(firebase.db, "usuarios"),
    where("rol", "==", "docente"),
  );
  const resultado = await getDocs(consulta);

  const solicitudes = await Promise.all(
    resultado.docs
      .map(async (documento) => {
        const usuario = documento.data() as UsuarioApp;
        if (usuario.estado !== "pendiente_registro") {
          return null;
        }
        const docente = await obtener_docente_vinculado(usuario.persona_id_referencia, usuario.correo);

        return {
          solicitud_id: documento.id,
          uid: usuario.uid,
          correo: usuario.correo,
          cedula: usuario.cedula,
          nombres: `${usuario.apellidos} ${usuario.nombres}`.trim(),
          estado: usuario.estado,
          creado_en: usuario.creado_en,
          ultimo_acceso: usuario.ultimo_acceso,
          persona_id_referencia: usuario.persona_id_referencia,
          docente_encontrado: Boolean(docente),
          docente,
        } satisfies SolicitudAccesoDocente;
      }),
  );

  return solicitudes
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.ultimo_acceso.localeCompare(a.ultimo_acceso));
}

async function obtener_docente_vinculado(personaId: string, correo: string) {
  const firebase = obtenerFirebaseBase();

  if (!firebase) {
    return null;
  }

  const porId = await getDoc(doc(firebase.db, "docentes", personaId));
  if (porId.exists()) {
    return porId.data();
  }

  const consultaCorreo = query(collection(firebase.db, "docentes"), where("correo", "==", normalizar_correo(correo)), limit(1));
  const resultadoCorreo = await getDocs(consultaCorreo);
  return resultadoCorreo.docs[0]?.data() ?? null;
}

export async function actualizar_estado_usuario(uid: string, estado: UsuarioApp["estado"]) {
  if (!firebaseConfigurado()) {
    let actualizado: UsuarioApp | null = null;

    baseUsuarios = baseUsuarios.map((usuario) => {
      if (usuario.uid !== uid) {
        return usuario;
      }

      actualizado = {
        ...usuario,
        estado,
      };

      return actualizado;
    });

    return actualizado;
  }

  const firebase = obtenerFirebaseBase();

  if (!firebase) {
    return null;
  }

  const referencia = doc(firebase.db, "usuarios", uid);
  const instantanea = await getDoc(referencia);

  if (!instantanea.exists()) {
    return null;
  }

  const usuario = {
    ...(instantanea.data() as UsuarioApp),
    estado,
  } satisfies UsuarioApp;

  await setDoc(referencia, usuario, { merge: true });
  return usuario;
}

export async function aprobar_solicitud_docente(uid: string) {
  const usuario = await actualizar_estado_usuario(uid, "activo");

  if (!usuario) {
    throw new Error("No se encontró la solicitud docente.");
  }

  await actualizar_estado_docente(usuario.persona_id_referencia, "activo", usuario.uid);
  return usuario;
}

export async function bloquear_solicitud_docente(uid: string) {
  const usuario = await actualizar_estado_usuario(uid, "bloqueado");

  if (!usuario) {
    throw new Error("No se encontró la solicitud docente.");
  }

  await actualizar_estado_docente(usuario.persona_id_referencia, "bloqueado", usuario.uid);
  return usuario;
}
