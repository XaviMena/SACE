import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { configuracionFirebase, firebaseConfigurado } from "@/lib/firebase/config";

export function obtenerFirebaseBase() {
  if (!firebaseConfigurado()) {
    return null;
  }

  const app = getApps()[0] ?? initializeApp(configuracionFirebase);

  return {
    app,
    db: getFirestore(app),
  };
}

export function obtenerFirebaseCliente() {
  const base = obtenerFirebaseBase();

  if (!base || typeof window === "undefined") {
    return null;
  }

  return {
    ...base,
    auth: getAuth(base.app),
    storage: getStorage(base.app),
  };
}
