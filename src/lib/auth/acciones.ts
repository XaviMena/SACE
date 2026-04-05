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
import { normalizar_correo } from "@/lib/validaciones/identidad";
import type { UsuarioApp } from "@/types/auth";

const CLAVE_SESION_CREDENCIALES = "saceSesionCredenciales";
const EVENTO_SESION = "sace-auth-change";

const URL_ACCION = {
  url: process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/login`
    : "http://localhost:3000/login",
  handleCodeInApp: true,
};

function obtenerSesionCredencialesLocal() {
  if (typeof window === "undefined") {
    return null;
  }

  const sesionGuardada = window.localStorage.getItem(CLAVE_SESION_CREDENCIALES);

  if (!sesionGuardada) {
    return null;
  }

  try {
    const datos = JSON.parse(sesionGuardada) as { correo?: string; tipo?: string; uid?: string };

    if (datos.tipo !== "credenciales" || !datos.correo || !datos.uid) {
      return null;
    }

    return {
      correo: normalizar_correo(datos.correo),
      uid: String(datos.uid),
    };
  } catch {
    return null;
  }
}

export async function iniciar_sesion_con_credenciales(correo: string, contrasena: string) {
  const respuesta = await fetch("/api/auth/credenciales", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      correo,
      contrasena,
    }),
  });

  const datos = (await respuesta.json()) as {
    ok?: boolean;
    mensaje?: string;
    usuario?: UsuarioApp | null;
  };

  if (!respuesta.ok || !datos.ok || !datos.usuario) {
    return {
      ok: false,
      mensaje: datos.mensaje ?? "Correo o contraseña incorrectos.",
    };
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      CLAVE_SESION_CREDENCIALES,
      JSON.stringify({
        tipo: "credenciales",
        uid: datos.usuario.uid,
        correo: datos.usuario.correo,
      }),
    );
    window.dispatchEvent(new Event(EVENTO_SESION));
  }

  return {
    ok: true,
    mensaje: datos.mensaje ?? "Credenciales validadas. Estamos ingresando al panel institucional.",
  };
}

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

  if (typeof window !== "undefined") {
    window.localStorage.removeItem(CLAVE_SESION_CREDENCIALES);
    window.dispatchEvent(new Event(EVENTO_SESION));
  }

  if (cliente) {
    await signOut(cliente.auth);
    window.localStorage.removeItem("correoAccesoSace");
  }
}

export async function obtener_usuario_actual() {
  const sesionCredenciales = obtenerSesionCredencialesLocal();

  if (!sesionCredenciales) {
    return Promise.resolve(null);
  }

  const respuesta = await fetch("/api/auth/usuario", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      uid: sesionCredenciales.uid,
    }),
  });

  const datos = (await respuesta.json()) as {
    usuario?: UsuarioApp | null;
  };

  return Promise.resolve(datos.usuario ?? null);
}

export async function obtener_rol_usuario_actual() {
  const usuario = await obtener_usuario_actual();
  return Promise.resolve(usuario?.rol ?? null);
}

export function observar_estado_auth(
  callback: (usuario: { uid: string; correo: string } | null) => void | Promise<void>,
) {
  const sesionCredenciales = obtenerSesionCredencialesLocal();

  if (sesionCredenciales) {
    callback(sesionCredenciales);
    return () => undefined;
  }

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
    const credencial = await signInWithEmailLink(cliente.auth, correoGuardado, window.location.href);
    await credencial.user.getIdToken();
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

export function obtener_sesion_credenciales_local() {
  return obtenerSesionCredencialesLocal();
}

export function observar_sesion_local(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const manejarCambio = () => callback();

  window.addEventListener(EVENTO_SESION, manejarCambio);
  window.addEventListener("storage", manejarCambio);

  return () => {
    window.removeEventListener(EVENTO_SESION, manejarCambio);
    window.removeEventListener("storage", manejarCambio);
  };
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
    const credencial = await signInWithEmailLink(cliente.auth, correoNormalizado, window.location.href);
    await credencial.user.getIdToken();
    window.localStorage.setItem("correoAccesoSace", correoNormalizado);
    window.history.replaceState({}, document.title, window.location.pathname);

    return { completado: true, error: null };
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "No se pudo completar el enlace mágico.";
    return { completado: false, error: mensaje };
  }
}
