import { docentesSemilla } from "@/lib/repositorios/datos-semilla";
import { obtenerFirebaseBase } from "@/lib/firebase/cliente";
import { firebaseConfigurado } from "@/lib/firebase/config";
import { obtener_usuario_por_correo } from "@/lib/repositorios/usuarios";
import {
  esquemaDocente,
  normalizar_cedula,
  normalizar_correo,
  normalizar_telefono_ec,
  type ValoresFormularioDocente,
} from "@/lib/validaciones/identidad";
import type { Docente } from "@/types/docentes";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  where,
} from "firebase/firestore";

let baseDocentes = [...docentesSemilla];

export async function listar_docentes() {
  if (!firebaseConfigurado()) {
    return Promise.resolve(baseDocentes);
  }

  const firebase = obtenerFirebaseBase();

  if (!firebase) {
    return Promise.resolve(baseDocentes);
  }

  try {
    const consulta = query(collection(firebase.db, "docentes"), orderBy("nombres_apellidos", "asc"));
    const resultado = await getDocs(consulta);

    return resultado.docs.map((documento) => documento.data() as Docente);
  } catch (error) {
    console.warn("SACE: no se pudo leer docentes desde Firestore, se usa semilla local.", error);
    return Promise.resolve(baseDocentes);
  }
}

export async function obtener_docente_por_cedula(cedula: string) {
  const cedulaNormalizada = normalizar_cedula(cedula);

  if (!firebaseConfigurado()) {
    return Promise.resolve(
      baseDocentes.find((docente) => docente.cedula === cedulaNormalizada) ?? null,
    );
  }

  const firebase = obtenerFirebaseBase();

  if (!firebase) {
    return Promise.resolve(
      baseDocentes.find((docente) => docente.cedula === cedulaNormalizada) ?? null,
    );
  }

  const referencia = doc(firebase.db, "docentes", cedulaNormalizada);
  const instantanea = await getDoc(referencia);

  if (instantanea.exists()) {
    return instantanea.data() as Docente;
  }

  return Promise.resolve(
    baseDocentes.find((docente) => docente.cedula === cedulaNormalizada) ?? null,
  );
}

export async function guardar_docente(docente: Docente) {
  const docenteValidado = esquemaDocente.parse({
    ...docente,
    cedula: normalizar_cedula(docente.cedula),
    docente_id: normalizar_cedula(docente.docente_id),
    correo: normalizar_correo(docente.correo),
    telefono: normalizar_telefono_ec(docente.telefono),
  });

  if (firebaseConfigurado()) {
    const firebase = obtenerFirebaseBase();

    if (firebase) {
      await validar_unicidad_docente(docenteValidado);
      await setDoc(doc(firebase.db, "docentes", docenteValidado.docente_id), docenteValidado);
      return Promise.resolve(docenteValidado);
    }
  }

  const indice = baseDocentes.findIndex((item) => item.docente_id === docenteValidado.docente_id);

  if (indice >= 0) {
    baseDocentes[indice] = docenteValidado;
  } else {
    baseDocentes = [docenteValidado, ...baseDocentes];
  }

  return Promise.resolve(docenteValidado);
}

export async function crear_docente(datos: ValoresFormularioDocente) {
  const cedulaNormalizada = normalizar_cedula(datos.cedula);
  const correoNormalizado = normalizar_correo(datos.correo);

  const nuevoDocente = esquemaDocente.parse({
    docente_id: cedulaNormalizada,
    cedula: cedulaNormalizada,
    nombres_apellidos: datos.nombres_apellidos.trim().toUpperCase(),
    correo: correoNormalizado,
    telefono: normalizar_telefono_ec(datos.telefono),
    activo: datos.activo,
    usuario_uid: null,
    estado_registro: datos.estado_registro,
  });

  if (firebaseConfigurado()) {
    const firebase = obtenerFirebaseBase();

    if (firebase) {
      await validar_unicidad_docente(nuevoDocente);
      await setDoc(doc(firebase.db, "docentes", nuevoDocente.docente_id), nuevoDocente);
      return Promise.resolve(nuevoDocente);
    }
  }

  const docentePorCedula = baseDocentes.find((item) => item.cedula === cedulaNormalizada);
  if (docentePorCedula) {
    throw new Error("Ya existe un docente registrado con esa cédula.");
  }

  const docentePorCorreo = baseDocentes.find((item) => normalizar_correo(item.correo) === correoNormalizado);
  if (docentePorCorreo) {
    throw new Error("Ya existe un docente registrado con ese correo.");
  }

  baseDocentes = [nuevoDocente, ...baseDocentes];

  return Promise.resolve(nuevoDocente);
}

async function validar_unicidad_docente(docente: Docente) {
  const firebase = obtenerFirebaseBase();

  if (!firebase) {
    return;
  }

  const consultaCedula = query(
    collection(firebase.db, "docentes"),
    where("cedula", "==", docente.cedula),
  );
  const coincidenciasCedula = await getDocs(consultaCedula);
  const conflictoCedula = coincidenciasCedula.docs.find((documento) => documento.id !== docente.docente_id);

  if (conflictoCedula) {
    throw new Error("Ya existe un docente registrado con esa cédula.");
  }

  const consultaCorreo = query(
    collection(firebase.db, "docentes"),
    where("correo", "==", docente.correo),
  );
  const coincidenciasCorreo = await getDocs(consultaCorreo);
  const conflictoCorreo = coincidenciasCorreo.docs.find((documento) => documento.id !== docente.docente_id);

  if (conflictoCorreo) {
    throw new Error("Ya existe un docente registrado con ese correo.");
  }

  const usuarioConMismoCorreo = await obtener_usuario_por_correo(docente.correo);

  if (
    usuarioConMismoCorreo &&
    usuarioConMismoCorreo.persona_id_referencia !== docente.cedula &&
    usuarioConMismoCorreo.cedula !== docente.cedula
  ) {
    throw new Error("Ese correo ya pertenece a otro perfil institucional.");
  }
}
