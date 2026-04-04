import { doc, getDoc, setDoc } from "firebase/firestore";
import { usuarioAdminSemilla, docentesSemilla } from "@/lib/repositorios/datos-semilla";
import { obtenerFirebaseBase } from "@/lib/firebase/cliente";

let siembraEnCurso: Promise<void> | null = null;

export async function asegurar_identidad_semilla_firestore() {
  const firebase = obtenerFirebaseBase();

  if (!firebase) {
    return;
  }

  if (siembraEnCurso) {
    return siembraEnCurso;
  }

  siembraEnCurso = (async () => {
    const referenciaUsuario = doc(firebase.db, "usuarios", usuarioAdminSemilla.uid);
    const usuarioExistente = await getDoc(referenciaUsuario);

    if (!usuarioExistente.exists()) {
      await setDoc(referenciaUsuario, usuarioAdminSemilla);
    }

    const docenteAdminSemilla =
      docentesSemilla.find((docente) => docente.cedula === usuarioAdminSemilla.cedula) ?? docentesSemilla[0];

    const referenciaDocente = doc(firebase.db, "docentes", docenteAdminSemilla.docente_id);
    const docenteExistente = await getDoc(referenciaDocente);

    if (!docenteExistente.exists()) {
      await setDoc(referenciaDocente, docenteAdminSemilla);
    }
  })().finally(() => {
    siembraEnCurso = null;
  });

  return siembraEnCurso;
}
