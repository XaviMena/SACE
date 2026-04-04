import type { UsuarioApp } from "@/types/auth";
import { usuarioAdminSemilla } from "@/lib/repositorios/datos-semilla";
import { obtenerFirebaseBase } from "@/lib/firebase/cliente";
import { firebaseConfigurado } from "@/lib/firebase/config";
import { normalizar_correo } from "@/lib/validaciones/identidad";
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

export async function obtener_usuario_por_uid(uid: string) {
  if (!firebaseConfigurado()) {
    const usuario = uid === usuarioAdminSemilla.uid ? usuarioAdminSemilla : null;
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
    return Promise.resolve(
      usuarioAdminSemilla.correo === correoNormalizado ? (usuarioAdminSemilla satisfies UsuarioApp) : null,
    );
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
    return obtener_usuario_actual_mock();
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
    return usuarioAdminSemilla;
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
