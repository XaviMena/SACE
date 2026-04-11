import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { DocumentData } from "firebase-admin/firestore";
import initSqlJs from "sql.js";
import { obtenerFirebaseAdmin } from "@/lib/firebase/admin";
import { docentesSemilla, usuarioAdminSemilla } from "@/lib/repositorios/datos-semilla";
import { normalizar_cedula, normalizar_correo } from "@/lib/validaciones/identidad";
import type { DocenteConUsuario, SolicitudAccesoDocente } from "@/types/administracion";
import type { RolUsuario, UsuarioApp } from "@/types/auth";
import type { Docente } from "@/types/docentes";

let baseUsuariosServidor = [usuarioAdminSemilla];
let baseDocentesServidor = [...docentesSemilla];
let docentesLegacyCache: Docente[] | null = null;

const RUTA_DISTRIBUTIVO_DB = "/Users/xaviermena/Desktop/Programas/distributivo/Distributivo.db";
const RUTA_USUARIOS_LOCALES = `${process.cwd()}/.data/usuarios-servidor.json`;
const CONTRASENA_ADMIN_CREDENCIALES = "Admin123";
const TIEMPO_ESPERA_FIREBASE_MS = 4000;
const CEDULA_ADMIN_RESERVADO = "0201305406";

function es_admin_reservado(valor?: string | null) {
  if (!valor) {
    return false;
  }

  return variantes_cedula(valor).includes(CEDULA_ADMIN_RESERVADO);
}

function aplicar_reglas_admin_reservado(usuario: UsuarioApp) {
  if (
    es_admin_reservado(usuario.cedula) ||
    es_admin_reservado(usuario.persona_id_referencia) ||
    usuario.uid === usuarioAdminSemilla.uid
  ) {
    return {
      ...usuario,
      rol: "admin",
      estado: "activo",
      cedula: CEDULA_ADMIN_RESERVADO,
      persona_id_referencia: CEDULA_ADMIN_RESERVADO,
    } satisfies UsuarioApp;
  }

  return usuario;
}

function obtener_clave_por_defecto_usuario(usuario: UsuarioApp) {
  if (usuario.rol === "admin") {
    return CONTRASENA_ADMIN_CREDENCIALES;
  }

  if (["docente", "autoridad", "dece"].includes(usuario.rol)) {
    return normalizar_cedula(usuario.cedula);
  }

  return "";
}

function obtener_clave_vigente_usuario(usuario: UsuarioApp) {
  const clavePersonalizada = typeof usuario.clave_acceso === "string" ? usuario.clave_acceso.trim() : "";
  return clavePersonalizada || obtener_clave_por_defecto_usuario(usuario);
}

function validar_clave_usuario(usuario: UsuarioApp, claveIngresada: string) {
  const claveVigente = obtener_clave_vigente_usuario(usuario);

  if (["docente", "autoridad", "dece"].includes(usuario.rol) && !usuario.clave_acceso) {
    return normalizar_cedula(claveIngresada) === normalizar_cedula(claveVigente);
  }

  return claveIngresada === claveVigente;
}

function variantes_cedula(valor: string) {
  const normalizada = normalizar_cedula(valor);
  const sinCeroInicial = normalizada.replace(/^0+/, "");
  return [...new Set([normalizada, sinCeroInicial].filter(Boolean))];
}

function texto_sqlite(valor: unknown) {
  return typeof valor === "string" ? valor.trim() : "";
}

function a_booleano_sqlite(valor: unknown) {
  if (typeof valor === "number") {
    return valor === 1;
  }

  if (typeof valor === "string") {
    return ["1", "true", "si", "sí", "activo", "yes", "y"].includes(valor.trim().toLowerCase());
  }

  return Boolean(valor);
}

async function con_timeout<T>(promesa: Promise<T>, mensaje: string) {
  return Promise.race<T>([
    promesa,
    new Promise<T>((_, reject) => {
      const timeout = setTimeout(() => {
        clearTimeout(timeout);
        reject(new Error(mensaje));
      }, TIEMPO_ESPERA_FIREBASE_MS);
    }),
  ]);
}

async function cargar_docentes_legacy_servidor() {
  if (docentesLegacyCache) {
    return docentesLegacyCache;
  }

  try {
    const SQL = await initSqlJs({
      locateFile: (file: string) => `${process.cwd()}/node_modules/sql.js/dist/${file}`,
    });
    const archivo = await readFile(RUTA_DISTRIBUTIVO_DB);
    const sqlite = new SQL.Database(archivo);
    const resultado = sqlite.exec(
      "SELECT docente_id, cedula, nombres_apellidos, nombre, correo, esta_en_ie FROM Docentes",
    )[0];

    if (!resultado?.columns || !resultado.values) {
      docentesLegacyCache = [];
      sqlite.close();
      return docentesLegacyCache;
    }

    docentesLegacyCache = resultado.values
      .map((fila) => Object.fromEntries(resultado.columns.map((columna, indice) => [columna, fila[indice] ?? null])))
      .map((fila) => {
        const cedula = normalizar_cedula(texto_sqlite(fila.cedula) || texto_sqlite(fila.docente_id));
        const docenteId = normalizar_cedula(texto_sqlite(fila.docente_id) || cedula);

        return {
          docente_id: docenteId,
          cedula,
          nombres_apellidos: (texto_sqlite(fila.nombres_apellidos) || texto_sqlite(fila.nombre)).toUpperCase(),
          correo: normalizar_correo(texto_sqlite(fila.correo)),
          telefono: "",
          activo: a_booleano_sqlite(fila.esta_en_ie),
          usuario_uid: null,
          estado_registro: "pendiente_registro",
        } satisfies Docente;
      })
      .filter((docente) => docente.docente_id.length === 10 && docente.cedula.length === 10);

    sqlite.close();
    return docentesLegacyCache;
  } catch (error) {
    console.warn("SACE: no se pudo leer la base legacy de docentes.", error);
    docentesLegacyCache = [];
    return docentesLegacyCache;
  }
}

async function obtener_docente_local_servidor(cedula: string, correo: string) {
  const cedulaNormalizada = normalizar_cedula(cedula);
  const correoNormalizado = normalizar_correo(correo);
  const docenteLocal =
    baseDocentesServidor.find(
      (docente) =>
        docente.cedula === cedulaNormalizada ||
        docente.docente_id === cedulaNormalizada ||
        (correoNormalizado && normalizar_correo(docente.correo) === correoNormalizado),
    ) ?? null;

  if (docenteLocal) {
    return docenteLocal;
  }

  const docentesLegacy = await cargar_docentes_legacy_servidor();
  const docenteLegacy =
    docentesLegacy.find(
      (docente) =>
        docente.cedula === cedulaNormalizada ||
        docente.docente_id === cedulaNormalizada ||
        (correoNormalizado && normalizar_correo(docente.correo) === correoNormalizado),
    ) ?? null;

  if (!docenteLegacy) {
    return null;
  }

  if (!baseDocentesServidor.some((docente) => docente.docente_id === docenteLegacy.docente_id)) {
    baseDocentesServidor = [docenteLegacy, ...baseDocentesServidor];
  }

  return docenteLegacy;
}

async function listar_docentes_base_servidor() {
  const firebase = obtenerFirebaseAdmin();

  if (!firebase) {
    const docentesLegacy = await cargar_docentes_legacy_servidor();
    const porId = new Map<string, Docente>();

    for (const docente of [...docentesLegacy, ...baseDocentesServidor]) {
      porId.set(docente.docente_id, docente);
    }

    return [...porId.values()];
  }

  try {
    const resultado = await con_timeout(
      firebase.db.collection("docentes").get(),
      "Firebase tardó demasiado al listar docentes.",
    );

    return resultado.docs.map((documento) => documento.data() as Docente);
  } catch {
    const docentesLegacy = await cargar_docentes_legacy_servidor();
    const porId = new Map<string, Docente>();

    for (const docente of [...docentesLegacy, ...baseDocentesServidor]) {
      porId.set(docente.docente_id, docente);
    }

    return [...porId.values()];
  }
}

async function obtener_docente_por_id_servidor(docenteId: string) {
  const docentes = await listar_docentes_base_servidor();
  return docentes.find((docente) => docente.docente_id === normalizar_cedula(docenteId)) ?? null;
}

function fusionar_usuarios_locales(...colecciones: UsuarioApp[][]) {
  const porUid = new Map<string, UsuarioApp>();

  for (const coleccion of colecciones) {
    for (const usuario of coleccion) {
      porUid.set(usuario.uid, aplicar_reglas_admin_reservado(usuario));
    }
  }

  return [...porUid.values()];
}

async function hidratar_usuarios_locales_servidor() {
  try {
    const contenido = await readFile(RUTA_USUARIOS_LOCALES, "utf8");
    const persistidos = JSON.parse(contenido) as UsuarioApp[];
    baseUsuariosServidor = fusionar_usuarios_locales([usuarioAdminSemilla], persistidos);
  } catch {
    baseUsuariosServidor = fusionar_usuarios_locales([usuarioAdminSemilla], baseUsuariosServidor);
  }

  return baseUsuariosServidor;
}

async function persistir_usuarios_locales_servidor(usuarios: UsuarioApp[]) {
  baseUsuariosServidor = fusionar_usuarios_locales([usuarioAdminSemilla], usuarios);
  await mkdir(dirname(RUTA_USUARIOS_LOCALES), { recursive: true });
  await writeFile(RUTA_USUARIOS_LOCALES, JSON.stringify(baseUsuariosServidor, null, 2), "utf8");
  return baseUsuariosServidor;
}

async function obtener_usuario_local_por_uid_servidor(uid: string) {
  const usuariosLocales = await hidratar_usuarios_locales_servidor();
  return usuariosLocales.find((usuario) => usuario.uid === uid) ?? null;
}

async function obtener_usuario_local_por_correo_servidor(correo: string) {
  const usuariosLocales = await hidratar_usuarios_locales_servidor();
  const correoNormalizado = normalizar_correo(correo);
  return usuariosLocales.find((usuario) => normalizar_correo(usuario.correo) === correoNormalizado) ?? null;
}

async function obtener_usuario_local_vinculado_docente_servidor(docente: Docente) {
  const usuariosLocales = await hidratar_usuarios_locales_servidor();
  const cedulas = variantes_cedula(docente.cedula);
  const correoNormalizado = normalizar_correo(docente.correo);

  return (
    usuariosLocales.find((usuario) =>
      (docente.usuario_uid && usuario.uid === docente.usuario_uid) ||
      usuario.persona_id_referencia === docente.docente_id ||
      cedulas.includes(usuario.cedula) ||
      (correoNormalizado && normalizar_correo(usuario.correo) === correoNormalizado),
    ) ?? null
  );
}

async function actualizar_rol_usuario_local_servidor(
  uid: string,
  rol: Extract<RolUsuario, "admin" | "docente" | "autoridad" | "dece">,
) {
  const usuariosLocales = await hidratar_usuarios_locales_servidor();
  let actualizado: UsuarioApp | null = null;

  await persistir_usuarios_locales_servidor(usuariosLocales.map((usuario) => {
    if (usuario.uid !== uid) {
      return usuario;
    }

    if (es_admin_reservado(usuario.cedula) || es_admin_reservado(usuario.persona_id_referencia) || uid === usuarioAdminSemilla.uid) {
      actualizado = aplicar_reglas_admin_reservado(usuario);
      return actualizado;
    }

    actualizado = {
      ...usuario,
      rol,
    };

    return actualizado;
  }));

  return actualizado;
}

export async function obtener_usuario_por_uid_servidor(uid: string) {
  const firebase = obtenerFirebaseAdmin();

  if (!firebase) {
    return obtener_usuario_local_por_uid_servidor(uid);
  }

  try {
    const usuarioLocal = await obtener_usuario_local_por_uid_servidor(uid);
    const documento = await con_timeout(
      firebase.db.collection("usuarios").doc(uid).get(),
      "Firebase tardó demasiado al consultar el usuario por identificador.",
    );
    if (!documento.exists) {
      return usuarioLocal;
    }

    const usuarioFirebase = documento.data() as UsuarioApp;
    return usuarioLocal ? { ...usuarioFirebase, ...usuarioLocal } : usuarioFirebase;
  } catch {
    return obtener_usuario_local_por_uid_servidor(uid);
  }
}

async function obtener_usuario_vinculado_docente_servidor(docente: Docente) {
  const firebase = obtenerFirebaseAdmin();
  const usuarioLocal = await obtener_usuario_local_vinculado_docente_servidor(docente);

  if (!firebase) {
    return usuarioLocal;
  }

  try {
    if (docente.usuario_uid) {
      const porUid = await con_timeout(
        firebase.db.collection("usuarios").doc(docente.usuario_uid).get(),
        "Firebase tardó demasiado al consultar el usuario vinculado del docente.",
      );

      if (porUid.exists) {
        const usuario = porUid.data() as UsuarioApp;
        return usuarioLocal ? { ...usuario, ...usuarioLocal } : usuario;
      }
    }

    const porPersona = await con_timeout(
      firebase.db.collection("usuarios").where("persona_id_referencia", "==", docente.docente_id).limit(1).get(),
      "Firebase tardó demasiado al consultar el vínculo del docente por referencia.",
    );

    if (porPersona.docs[0]) {
      const usuario = porPersona.docs[0].data() as UsuarioApp;
      return usuarioLocal ? { ...usuario, ...usuarioLocal } : usuario;
    }

    const cedulas = variantes_cedula(docente.cedula);
    for (const cedula of cedulas) {
      const porCedula = await con_timeout(
        firebase.db.collection("usuarios").where("cedula", "==", cedula).limit(1).get(),
        "Firebase tardó demasiado al consultar el vínculo del docente por cédula.",
      );

      if (porCedula.docs[0]) {
        const usuario = porCedula.docs[0].data() as UsuarioApp;
        return usuarioLocal ? { ...usuario, ...usuarioLocal } : usuario;
      }
    }

    const correoNormalizado = normalizar_correo(docente.correo);
    if (correoNormalizado) {
      const porCorreo = await con_timeout(
        firebase.db.collection("usuarios").where("correo", "==", correoNormalizado).limit(1).get(),
        "Firebase tardó demasiado al consultar el vínculo del docente por correo.",
      );

      if (porCorreo.docs[0]) {
        const usuario = porCorreo.docs[0].data() as UsuarioApp;
        return usuarioLocal ? { ...usuario, ...usuarioLocal } : usuario;
      }
    }

    return usuarioLocal;
  } catch {
    return usuarioLocal;
  }
}

async function obtener_usuario_por_correo_servidor(correo: string) {
  const firebase = obtenerFirebaseAdmin();

  if (!firebase) {
    return obtener_usuario_local_por_correo_servidor(correo);
  }

  try {
    const usuarioLocal = await obtener_usuario_local_por_correo_servidor(correo);
    const resultado = await con_timeout(
      firebase.db
        .collection("usuarios")
        .where("correo", "==", normalizar_correo(correo))
        .limit(1)
        .get(),
      "Firebase tardó demasiado al consultar el usuario por correo.",
    );

    const usuarioFirebase = resultado.docs[0]?.data() as UsuarioApp | undefined;

    if (!usuarioFirebase) {
      return usuarioLocal;
    }

    return usuarioLocal ? { ...usuarioFirebase, ...usuarioLocal } : usuarioFirebase;
  } catch {
    return obtener_usuario_local_por_correo_servidor(correo);
  }
}

export async function obtener_usuario_para_sesion_servidor(uid: string) {
  if (uid === usuarioAdminSemilla.uid) {
    return (await obtener_usuario_por_uid_servidor(uid)) ?? usuarioAdminSemilla;
  }

  return obtener_usuario_por_uid_servidor(uid);
}

async function guardar_clave_acceso_local_servidor(uid: string, claveNueva: string, usuarioBase?: UsuarioApp | null) {
  const usuariosLocales = await hidratar_usuarios_locales_servidor();
  let usuarioActualizado = usuarioBase ? { ...usuarioBase, clave_acceso: claveNueva } : null;
  let encontrado = false;

  const usuariosActualizados = usuariosLocales.map((usuario) => {
    if (usuario.uid !== uid) {
      return usuario;
    }

    encontrado = true;
    usuarioActualizado = {
      ...usuario,
      clave_acceso: claveNueva,
    };

    return usuarioActualizado;
  });

  await persistir_usuarios_locales_servidor(
    encontrado || !usuarioActualizado ? usuariosActualizados : [usuarioActualizado, ...usuariosActualizados],
  );

  return usuarioActualizado;
}

export async function cambiar_clave_acceso_servidor(
  uid: string,
  claveActual: string,
  claveNueva: string,
  claveConfirmacion: string,
) {
  if (claveNueva.trim().length < 6) {
    throw new Error("La nueva clave debe tener al menos 6 caracteres.");
  }

  if (claveNueva !== claveConfirmacion) {
    throw new Error("La confirmación de la nueva clave no coincide.");
  }

  const usuario = await obtener_usuario_por_uid_servidor(uid);

  if (!usuario) {
    throw new Error("No se encontró una sesión válida.");
  }

  if (!validar_clave_usuario(usuario, claveActual)) {
    throw new Error("La clave anterior no es correcta.");
  }

  const firebase = obtenerFirebaseAdmin();

  if (!firebase) {
    const actualizado = await guardar_clave_acceso_local_servidor(uid, claveNueva, usuario);

    if (!actualizado) {
      throw new Error("No se pudo actualizar la clave de acceso.");
    }

    return actualizado;
  }

  try {
    const referencia = firebase.db.collection("usuarios").doc(uid);
    const existente = await con_timeout(
      referencia.get(),
      "Firebase tardó demasiado al consultar la clave de acceso.",
    );

    if (!existente.exists) {
      const actualizadoLocal = await guardar_clave_acceso_local_servidor(uid, claveNueva, usuario);

      if (!actualizadoLocal) {
        throw new Error("No se pudo actualizar la clave de acceso.");
      }

      return actualizadoLocal;
    }

    const actualizado = {
      ...(existente.data() as UsuarioApp),
      clave_acceso: claveNueva,
    } satisfies UsuarioApp;

    await con_timeout(
      referencia.set({ clave_acceso: claveNueva }, { merge: true }),
      "Firebase tardó demasiado al guardar la clave de acceso.",
    );

    await guardar_clave_acceso_local_servidor(uid, claveNueva, actualizado);
    return actualizado;
  } catch {
    const actualizado = await guardar_clave_acceso_local_servidor(uid, claveNueva, usuario);

    if (!actualizado) {
      throw new Error("No se pudo actualizar la clave de acceso.");
    }

    return actualizado;
  }
}

export async function autenticar_credenciales_servidor(correo: string, contrasena: string) {
  const correoNormalizado = normalizar_correo(correo);
  const usuario = await obtener_usuario_por_correo_servidor(correoNormalizado);

  if (!usuario) {
    return {
      ok: false as const,
      usuario: null,
      mensaje: "El correo no pertenece a un usuario habilitado.",
    };
  }

  if (usuario.estado === "pendiente_registro") {
    return {
      ok: false as const,
      usuario,
      mensaje: "Tu acceso aún está pendiente de aprobación.",
    };
  }

  if (usuario.estado === "bloqueado") {
    return {
      ok: false as const,
      usuario,
      mensaje: "Tu acceso se encuentra bloqueado. Comunícate con administración.",
    };
  }

  if (!["admin", "docente", "autoridad", "dece"].includes(usuario.rol)) {
    return {
      ok: false as const,
      usuario,
      mensaje: "Correo o contraseña incorrectos.",
    };
  }

  if (!validar_clave_usuario(usuario, contrasena)) {
    return {
      ok: false as const,
      usuario,
      mensaje: "Correo o contraseña incorrectos.",
    };
  }

  return {
    ok: true as const,
    usuario,
    mensaje: "Credenciales validadas. Estamos ingresando al panel institucional.",
  };
}

async function sincronizar_docente_vinculado_servidor(uid: string, usuario: UsuarioApp) {
  const firebase = obtenerFirebaseAdmin();

  if (!firebase) {
    return;
  }

  const referencia = firebase.db.collection("docentes").doc(usuario.persona_id_referencia);
  const documento = await referencia.get();

  if (!documento.exists) {
    return;
  }

  await referencia.set(
    {
      usuario_uid: uid,
      correo: usuario.correo,
      telefono: usuario.telefono,
    },
    { merge: true },
  );
}

export async function resolver_usuario_autenticado_servidor(uid: string, correo: string) {
  const firebase = obtenerFirebaseAdmin();

  if (!firebase) {
    return null;
  }

  const correoNormalizado = normalizar_correo(correo);
  const referenciaActual = firebase.db.collection("usuarios").doc(uid);
  const usuarioActual = await referenciaActual.get();
  const marcaTiempo = new Date().toISOString();

  if (usuarioActual.exists) {
    await referenciaActual.set(
      {
        correo: correoNormalizado,
        ultimo_acceso: marcaTiempo,
      },
      { merge: true },
    );

    const usuario = {
      ...(usuarioActual.data() as UsuarioApp),
      correo: correoNormalizado,
      ultimo_acceso: marcaTiempo,
    } satisfies UsuarioApp;

    await sincronizar_docente_vinculado_servidor(uid, usuario);
    return usuario;
  }

  const usuarioPorCorreo = await obtener_usuario_por_correo_servidor(correoNormalizado);

  if (!usuarioPorCorreo) {
    return null;
  }

  const usuarioSincronizado: UsuarioApp = {
    ...usuarioPorCorreo,
    uid,
    correo: correoNormalizado,
    ultimo_acceso: marcaTiempo,
  };

  await referenciaActual.set(usuarioSincronizado);

  if (usuarioPorCorreo.uid !== uid) {
    await firebase.db.collection("usuarios").doc(usuarioPorCorreo.uid).delete();
  }

  await sincronizar_docente_vinculado_servidor(uid, usuarioSincronizado);
  return usuarioSincronizado;
}

export async function es_admin_servidor(uid: string) {
  const usuario = await obtener_usuario_por_uid_servidor(uid);
  return Boolean(usuario && usuario.rol === "admin" && usuario.estado === "activo");
}

export async function obtener_usuario_activo_servidor(uid: string) {
  const usuario = await obtener_usuario_por_uid_servidor(uid);
  return usuario && usuario.estado === "activo" ? usuario : null;
}

export async function listar_docentes_con_rol_servidor(): Promise<DocenteConUsuario[]> {
  const docentes = await listar_docentes_base_servidor();

  const docentesConRol = await Promise.all(
    docentes.map(async (docente) => {
      const usuario = await obtener_usuario_vinculado_docente_servidor(docente);
      const rolUsuario =
        usuario?.rol === "admin" || usuario?.rol === "docente" || usuario?.rol === "autoridad" || usuario?.rol === "dece"
          ? usuario.rol
          : null;

      return {
        ...docente,
        usuario_uid: usuario?.uid ?? docente.usuario_uid,
        rol_usuario: rolUsuario,
        acceso_vinculado: Boolean(usuario && usuario.estado === "activo" && rolUsuario),
        rol_editable: Boolean(
          usuario &&
          usuario.estado === "activo" &&
          (rolUsuario === "admin" || rolUsuario === "docente" || rolUsuario === "autoridad" || rolUsuario === "dece"),
        ),
      } satisfies DocenteConUsuario;
    }),
  );

  return docentesConRol.sort((a, b) => a.nombres_apellidos.localeCompare(b.nombres_apellidos, "es"));
}

export async function actualizar_rol_docente_servidor(
  docenteId: string,
  rol: Extract<RolUsuario, "admin" | "docente" | "autoridad" | "dece">,
) {
  if (!["admin", "docente", "autoridad", "dece"].includes(rol)) {
    throw new Error("El rol solicitado no es válido.");
  }

  const docente = await obtener_docente_por_id_servidor(docenteId);

  if (!docente) {
    throw new Error("No se encontró el docente solicitado.");
  }

  const usuario = await obtener_usuario_vinculado_docente_servidor(docente);

  if (!usuario) {
    throw new Error("Este docente todavía no tiene un acceso vinculado.");
  }

  if (
    rol !== "admin" &&
    (es_admin_reservado(docente.cedula) ||
      es_admin_reservado(docente.docente_id) ||
      es_admin_reservado(usuario.cedula) ||
      es_admin_reservado(usuario.persona_id_referencia) ||
      usuario.uid === usuarioAdminSemilla.uid)
  ) {
    throw new Error("El administrador principal debe conservar ese rol.");
  }

  const firebase = obtenerFirebaseAdmin();

  if (!firebase) {
    const actualizado = await actualizar_rol_usuario_local_servidor(usuario.uid, rol);

    if (!actualizado) {
      throw new Error("No se pudo actualizar el rol del docente.");
    }

    return actualizado;
  }

  try {
    const referencia = firebase.db.collection("usuarios").doc(usuario.uid);
    const instantanea = await con_timeout(
      referencia.get(),
      "Firebase tardó demasiado al consultar el usuario del docente.",
    );

    if (!instantanea.exists) {
      const actualizadoLocal = await actualizar_rol_usuario_local_servidor(usuario.uid, rol);

      if (!actualizadoLocal) {
        throw new Error("No se pudo actualizar el rol del docente.");
      }

      return actualizadoLocal;
    }

    const actualizado = {
      ...(instantanea.data() as UsuarioApp),
      rol,
    } satisfies UsuarioApp;

    await con_timeout(
      referencia.set({ rol }, { merge: true }),
      "Firebase tardó demasiado al guardar el rol del docente.",
    );

    await actualizar_rol_usuario_local_servidor(usuario.uid, rol);
    return actualizado;
  } catch {
    const actualizado = await actualizar_rol_usuario_local_servidor(usuario.uid, rol);

    if (!actualizado) {
      throw new Error("No se pudo actualizar el rol del docente.");
    }

    return actualizado;
  }
}

async function obtener_docente_vinculado_servidor(cedula: string) {
  const firebase = obtenerFirebaseAdmin();
  const cedulas = variantes_cedula(cedula);

  if (!firebase) {
    return (
      baseDocentesServidor.find(
        (docente) => cedulas.includes(docente.cedula) || cedulas.includes(docente.docente_id),
      ) ?? null
    );
  }

  for (const valor of cedulas) {
    const porId = await firebase.db.collection("docentes").doc(valor).get();

    if (porId.exists) {
      return porId.data() as Docente;
    }
  }

  for (const valor of cedulas) {
    const consultaCedula = await firebase.db
      .collection("docentes")
      .where("cedula", "==", valor)
      .limit(1)
      .get();

    if (consultaCedula.docs[0]) {
      return consultaCedula.docs[0].data() as Docente;
    }

    const consultaDocenteId = await firebase.db
      .collection("docentes")
      .where("docente_id", "==", valor)
      .limit(1)
      .get();

    if (consultaDocenteId.docs[0]) {
      return consultaDocenteId.docs[0].data() as Docente;
    }
  }

  return null;
}

function construir_nombres_desde_docente(docente: Docente) {
  return {
    nombres: docente.nombres_apellidos.trim(),
    apellidos: "",
  };
}

export async function registrar_solicitud_docente_servidor(cedula: string, correo: string) {
  await hidratar_usuarios_locales_servidor();

  const correoNormalizado = normalizar_correo(correo);
  const cedulaNormalizada = normalizar_cedula(cedula);
  const docente = await obtener_docente_local_servidor(cedulaNormalizada, "");
  const firebase = obtenerFirebaseAdmin();

  if (!docente) {
    throw new Error("No encontramos un docente registrado con esa cédula.");
  }

  const datosNombre = construir_nombres_desde_docente(docente);
  const ahora = new Date().toISOString();
  const existente = firebase
    ? await obtener_usuario_por_correo_servidor(correoNormalizado) ?? await obtener_usuario_por_uid_servidor(`solicitud-docente-${docente.docente_id}`)
    : baseUsuariosServidor.find(
        (usuario) => usuario.persona_id_referencia === docente.docente_id || usuario.correo === correoNormalizado,
      ) ?? null;

  if (existente?.estado === "activo") {
    return { estado: "activo" as const };
  }

  if (existente?.estado === "bloqueado") {
    return { estado: "bloqueado" as const };
  }

  const uid = existente?.uid ?? `solicitud-docente-${docente.docente_id}`;
  const solicitud: UsuarioApp = {
    uid,
    correo: correoNormalizado,
    rol: "docente",
    estado: "pendiente_registro",
    cedula: docente.cedula,
    telefono: docente.telefono,
    nombres: datosNombre.nombres,
    apellidos: datosNombre.apellidos,
    persona_id_referencia: docente.docente_id,
    creado_en: existente?.creado_en ?? ahora,
    ultimo_acceso: ahora,
  };

  if (firebase) {
    try {
      await con_timeout(
        firebase.db.collection("usuarios").doc(uid).set(solicitud, { merge: true }),
        "Firebase tardó demasiado al registrar la solicitud docente.",
      );
    } catch {
      await persistir_usuarios_locales_servidor([
        solicitud,
        ...baseUsuariosServidor.filter((usuario) => usuario.uid !== uid && usuario.correo !== correoNormalizado),
      ]);
    }
  } else {
    await persistir_usuarios_locales_servidor([
      solicitud,
      ...baseUsuariosServidor.filter((usuario) => usuario.uid !== uid && usuario.correo !== correoNormalizado),
    ]);
  }

  return { estado: "pendiente_registro" as const };
}

export async function listar_solicitudes_acceso_docentes_servidor(
  forzarLocal = false,
): Promise<SolicitudAccesoDocente[]> {
  const firebase = obtenerFirebaseAdmin();
  const solicitudesLocales = (await hidratar_usuarios_locales_servidor())
    .filter(
      (usuario) =>
        ["docente", "autoridad", "dece", "admin"].includes(usuario.rol) &&
        ["pendiente_registro", "activo"].includes(usuario.estado),
    )
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

  if (forzarLocal || !firebase) {
    return solicitudesLocales
      .sort((a, b) => b.ultimo_acceso.localeCompare(a.ultimo_acceso));
  }

  try {
    const resultado = await con_timeout(
      firebase.db.collection("usuarios").where("rol", "==", "docente").get(),
      "Firebase tardó demasiado al listar las solicitudes docentes.",
    );

    const solicitudesFirebase = await Promise.all(
      resultado.docs.map(async (documento) => {
        const usuario = documento.data() as UsuarioApp;

        if (!["pendiente_registro", "activo"].includes(usuario.estado)) {
          return null;
        }

        const docente = await obtener_docente_vinculado_servidor(usuario.cedula);

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

    const porUid = new Map<string, SolicitudAccesoDocente>();

    for (const solicitud of solicitudesLocales) {
      porUid.set(solicitud.uid, solicitud);
    }

    for (const solicitud of solicitudesFirebase.filter((item): item is NonNullable<typeof item> => item !== null)) {
      porUid.set(solicitud.uid, solicitud);
    }

    return [...porUid.values()].sort((a, b) => b.ultimo_acceso.localeCompare(a.ultimo_acceso));
  } catch {
    return solicitudesLocales.sort((a, b) => b.ultimo_acceso.localeCompare(a.ultimo_acceso));
  }
}

export async function revocar_aprobacion_docente_servidor(uid: string, forzarLocal = false) {
  const usuario = await actualizar_estado_usuario_servidor_forzado(uid, "pendiente_registro", forzarLocal);

  if (!usuario) {
    throw new Error("No se encontró el acceso docente.");
  }

  await actualizar_estado_docente_servidor(usuario.persona_id_referencia, "pendiente_registro", null, forzarLocal);
  return usuario;
}

async function actualizar_estado_docente_servidor(
  docenteId: string,
  estado: Docente["estado_registro"],
  usuarioUid?: string | null,
  forzarLocal = false,
) {
  const firebase = obtenerFirebaseAdmin();

  if (forzarLocal || !firebase) {
    let actualizado: Docente | null = null;

    baseDocentesServidor = baseDocentesServidor.map((docente) => {
      if (docente.docente_id !== docenteId) {
        return docente;
      }

      actualizado = {
        ...docente,
        estado_registro: estado,
        usuario_uid: usuarioUid ?? docente.usuario_uid,
      };

      return actualizado;
    });

    return actualizado;
  }

  try {
    const referencia = firebase.db.collection("docentes").doc(docenteId);
    const instantanea = await con_timeout(
      referencia.get(),
      "Firebase tardó demasiado al actualizar el estado del docente.",
    );

    if (!instantanea.exists) {
      return null;
    }

    const docente = instantanea.data() as Docente;
    const actualizado = {
      ...docente,
      estado_registro: estado,
      usuario_uid: usuarioUid ?? docente.usuario_uid,
    } satisfies Docente;

    await con_timeout(
      referencia.set(actualizado, { merge: true }),
      "Firebase tardó demasiado al guardar el estado del docente.",
    );
    return actualizado;
  } catch {
    return actualizar_estado_docente_servidor(docenteId, estado, usuarioUid, true);
  }
}

async function actualizar_estado_usuario_servidor(uid: string, estado: UsuarioApp["estado"]): Promise<UsuarioApp | null> {
  const firebase = obtenerFirebaseAdmin();

  if (!firebase) {
    let actualizado: UsuarioApp | null = null;

    baseUsuariosServidor = baseUsuariosServidor.map((usuario) => {
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

  try {
    const referencia = firebase.db.collection("usuarios").doc(uid);
    const instantanea = await con_timeout(
      referencia.get(),
      "Firebase tardó demasiado al actualizar el usuario.",
    );

    if (!instantanea.exists) {
      return actualizar_estado_usuario_servidor_forzado(uid, estado, true);
    }

    const usuario = {
      ...(instantanea.data() as UsuarioApp),
      estado,
    } satisfies UsuarioApp;

    await con_timeout(
      referencia.set(usuario, { merge: true }),
      "Firebase tardó demasiado al guardar el estado del usuario.",
    );
    return usuario;
  } catch {
    return actualizar_estado_usuario_servidor_forzado(uid, estado, true);
  }
}

async function actualizar_estado_usuario_servidor_forzado(
  uid: string,
  estado: UsuarioApp["estado"],
  forzarLocal = false,
): Promise<UsuarioApp | null> {
  if (forzarLocal) {
    const usuariosLocales = await hidratar_usuarios_locales_servidor();
    let actualizado: UsuarioApp | null = null;

    await persistir_usuarios_locales_servidor(usuariosLocales.map((usuario) => {
      if (usuario.uid !== uid) {
        return usuario;
      }

      actualizado = {
        ...usuario,
        estado,
      };

      return actualizado;
    }));

    return actualizado;
  }

  return actualizar_estado_usuario_servidor(uid, estado);
}

export async function aprobar_solicitud_docente_servidor(uid: string, forzarLocal = false) {
  const usuario = await actualizar_estado_usuario_servidor_forzado(uid, "activo", forzarLocal);

  if (!usuario) {
    throw new Error("No se encontró la solicitud docente.");
  }

  await actualizar_estado_docente_servidor(usuario.persona_id_referencia, "activo", usuario.uid, forzarLocal);
  return usuario;
}

export async function bloquear_solicitud_docente_servidor(uid: string, forzarLocal = false) {
  const usuario = await actualizar_estado_usuario_servidor_forzado(uid, "bloqueado", forzarLocal);

  if (!usuario) {
    throw new Error("No se encontró la solicitud docente.");
  }

  await actualizar_estado_docente_servidor(usuario.persona_id_referencia, "bloqueado", usuario.uid, forzarLocal);
  return usuario;
}

export async function eliminar_solicitud_docente_servidor(uid: string, forzarLocal = false) {
  if (forzarLocal) {
    const usuariosLocales = await hidratar_usuarios_locales_servidor();
    const usuario = usuariosLocales.find((item) => item.uid === uid) ?? null;

    if (!usuario) {
      throw new Error("No se encontró la solicitud docente.");
    }

    await persistir_usuarios_locales_servidor(usuariosLocales.filter((item) => item.uid !== uid));
    await actualizar_estado_docente_servidor(usuario.persona_id_referencia, "pendiente_registro", null, true);
    return usuario;
  }

  const firebase = obtenerFirebaseAdmin();

  if (!firebase) {
    throw new Error("No se pudo acceder al repositorio de solicitudes.");
  }

  try {
    const referencia = firebase.db.collection("usuarios").doc(uid);
    const instantanea = await con_timeout(
      referencia.get(),
      "Firebase tardó demasiado al eliminar la solicitud docente.",
    );

    if (!instantanea.exists) {
      return eliminar_solicitud_docente_servidor(uid, true);
    }

    const usuario = instantanea.data() as UsuarioApp;
    await con_timeout(
      referencia.delete(),
      "Firebase tardó demasiado al eliminar la solicitud docente.",
    );
    await actualizar_estado_docente_servidor(usuario.persona_id_referencia, "pendiente_registro", null, false);
    return usuario;
  } catch {
    return eliminar_solicitud_docente_servidor(uid, true);
  }
}

export async function buscar_documento_por_campo_servidor(
  coleccion: string,
  campo: string,
  valor: string,
): Promise<DocumentData | null> {
  const firebase = obtenerFirebaseAdmin();

  if (!firebase) {
    return null;
  }

  const resultado = await firebase.db.collection(coleccion).where(campo, "==", valor).limit(1).get();
  return resultado.docs[0]?.data() ?? null;
}

export async function upsert_documento_servidor(
  coleccion: string,
  id: string,
  datos: Record<string, unknown>,
) {
  const firebase = obtenerFirebaseAdmin();

  if (!firebase) {
    return { creado: false, actualizado: false };
  }

  const referencia = firebase.db.collection(coleccion).doc(id);
  const existente = await referencia.get();
  await referencia.set(datos, { merge: true });

  return {
    creado: !existente.exists,
    actualizado: existente.exists,
  };
}

export async function upsert_documentos_servidor(
  coleccion: string,
  documentos: Array<{ id: string; datos: Record<string, unknown> }>,
) {
  const firebase = obtenerFirebaseAdmin();

  if (!firebase || documentos.length === 0) {
    return { creados: 0, actualizados: 0 };
  }

  const referencias = documentos.map((documento) => firebase.db.collection(coleccion).doc(documento.id));
  const existentes = new Set<string>();

  for (let indice = 0; indice < referencias.length; indice += 200) {
    const bloque = referencias.slice(indice, indice + 200);
    const snapshots = await firebase.db.getAll(...bloque);

    for (const snapshot of snapshots) {
      if (snapshot.exists) {
        existentes.add(snapshot.id);
      }
    }
  }

  const writer = firebase.db.bulkWriter();

  for (const documento of documentos) {
    writer.set(firebase.db.collection(coleccion).doc(documento.id), documento.datos, { merge: true });
  }

  await writer.close();

  let creados = 0;
  let actualizados = 0;

  for (const documento of documentos) {
    if (existentes.has(documento.id)) {
      actualizados += 1;
    } else {
      creados += 1;
    }
  }

  return { creados, actualizados };
}
