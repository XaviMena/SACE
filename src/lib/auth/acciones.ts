"use client";

import {
  browserLocalPersistence,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  setPersistence,
  signInWithEmailLink,
  signOut,
} from "firebase/auth";
import { obtenerFirebaseCliente } from "@/lib/firebase/cliente";
import { obtener_modo_firebase } from "@/lib/firebase/config";
import { usuarioAdminSemilla } from "@/lib/repositorios/datos-semilla";
import { normalizar_correo } from "@/lib/validaciones/identidad";

const URL_ACCION = {
  url: process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/login`
    : "http://localhost:3000/login",
  handleCodeInApp: true,
};

export async function enviar_enlace_acceso(correo: string) {
  const correoNormalizado = normalizar_correo(correo);
  const cliente = obtenerFirebaseCliente();

  if (!cliente) {
    return {
      ok: true,
      modo: "simulado",
      mensaje: `Modo local: el enlace mágico se simularía para ${correoNormalizado}.`,
    };
  }

  try {
    await setPersistence(cliente.auth, browserLocalPersistence);
    await sendSignInLinkToEmail(cliente.auth, correoNormalizado, URL_ACCION);
    window.localStorage.setItem("correoAccesoSace", correoNormalizado);

    return {
      ok: true,
      modo: "firebase",
      mensaje: `Se envió un enlace de acceso a ${correoNormalizado}.`,
    };
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "No se pudo enviar el enlace de acceso.";

    return {
      ok: false,
      modo: "firebase",
      mensaje,
    };
  }
}

export async function cerrar_sesion() {
  const cliente = obtenerFirebaseCliente();

  if (cliente) {
    await signOut(cliente.auth);
    window.localStorage.removeItem("correoAccesoSace");
  }
}

export async function obtener_usuario_actual() {
  return Promise.resolve(usuarioAdminSemilla);
}

export async function obtener_rol_usuario_actual() {
  return Promise.resolve(usuarioAdminSemilla.rol);
}

export function observar_estado_auth(
  callback: (usuario: { uid: string; correo: string } | null) => void | Promise<void>,
) {
  const cliente = obtenerFirebaseCliente();

  if (!cliente) {
    callback(null);
    return () => undefined;
  }

  return onAuthStateChanged(cliente.auth, (usuario) => {
    callback(usuario?.email ? { uid: usuario.uid, correo: usuario.email } : null);
  });
}

export async function completar_acceso_magic_link() {
  const cliente = obtenerFirebaseCliente();

  if (!cliente || typeof window === "undefined") {
    return { completado: false, error: null };
  }

  if (!isSignInWithEmailLink(cliente.auth, window.location.href)) {
    return { completado: false, error: null };
  }

  const correoGuardado = window.localStorage.getItem("correoAccesoSace");

  if (!correoGuardado) {
    return {
      completado: false,
      error:
        "No se encontró el correo usado para el enlace mágico en este navegador. Ingresa nuevamente tu correo para completar el acceso.",
    };
  }

  try {
    await setPersistence(cliente.auth, browserLocalPersistence);
    await signInWithEmailLink(cliente.auth, correoGuardado, window.location.href);
    window.localStorage.removeItem("correoAccesoSace");
    window.history.replaceState({}, document.title, window.location.pathname);

    return { completado: true, error: null };
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "No se pudo completar el enlace mágico.";
    return { completado: false, error: mensaje };
  }
}

export function obtener_modo_acceso_actual() {
  return obtener_modo_firebase() as "firebase" | "simulado";
}

export function hay_magic_link_pendiente() {
  const cliente = obtenerFirebaseCliente();

  if (!cliente || typeof window === "undefined") {
    return false;
  }

  return isSignInWithEmailLink(cliente.auth, window.location.href);
}

export async function completar_acceso_magic_link_con_correo(correo: string) {
  const cliente = obtenerFirebaseCliente();

  if (!cliente || typeof window === "undefined") {
    return { completado: false, error: null };
  }

  if (!isSignInWithEmailLink(cliente.auth, window.location.href)) {
    return { completado: false, error: "El enlace actual no corresponde a un acceso válido." };
  }

  const correoNormalizado = normalizar_correo(correo);

  try {
    await setPersistence(cliente.auth, browserLocalPersistence);
    await signInWithEmailLink(cliente.auth, correoNormalizado, window.location.href);
    window.localStorage.setItem("correoAccesoSace", correoNormalizado);
    window.history.replaceState({}, document.title, window.location.pathname);

    return { completado: true, error: null };
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "No se pudo completar el enlace mágico.";
    return { completado: false, error: mensaje };
  }
}
