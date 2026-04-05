const configuracionFirebase = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function authForzadaASimulado() {
  return process.env.NEXT_PUBLIC_FORCE_AUTH_MODE === "simulado";
}

export function firebaseConfigurado() {
  if (authForzadaASimulado()) {
    return false;
  }

  return Boolean(
    configuracionFirebase.apiKey &&
      configuracionFirebase.authDomain &&
      configuracionFirebase.projectId &&
      configuracionFirebase.appId,
  );
}

export function obtener_modo_firebase() {
  return firebaseConfigurado() ? "firebase" : "simulado";
}

export function obtener_estado_firebase() {
  return {
    configurado: firebaseConfigurado(),
    modo: obtener_modo_firebase(),
    proyecto: configuracionFirebase.projectId ?? null,
    forzadoSimulado: authForzadaASimulado(),
  } as const;
}

export { configuracionFirebase };
