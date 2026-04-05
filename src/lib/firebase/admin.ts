import "server-only";

import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function authForzadaASimulado() {
  return process.env.NEXT_PUBLIC_FORCE_AUTH_MODE === "simulado";
}

function obtenerCredencialesAdmin() {
  if (authForzadaASimulado()) {
    return null;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    return cert({
      projectId,
      clientEmail,
      privateKey,
    });
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return applicationDefault();
  }

  return null;
}

export function obtenerFirebaseAdmin() {
  const credencial = obtenerCredencialesAdmin();

  if (!credencial) {
    return null;
  }

  const app = getApps()[0] ?? initializeApp({
    credential: credencial,
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });

  return {
    app,
    db: getFirestore(app),
  };
}
