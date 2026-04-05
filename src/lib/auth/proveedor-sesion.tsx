"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { UsuarioApp } from "@/types/auth";
import {
  completar_acceso_magic_link,
  obtener_modo_acceso_actual,
  obtener_sesion_credenciales_local,
  observar_sesion_local,
  observar_estado_auth,
  obtener_usuario_actual,
} from "@/lib/auth/acciones";
import { obtenerFirebaseCliente } from "@/lib/firebase/cliente";

interface ContextoSesion {
  usuario: UsuarioApp | null;
  cargando: boolean;
  puedeAccederPanel: boolean;
  motivoBloqueo: string | null;
  modoAcceso: "firebase" | "simulado";
}

const SesionContext = createContext<ContextoSesion>({
  usuario: null,
  cargando: true,
  puedeAccederPanel: false,
  motivoBloqueo: null,
  modoAcceso: "simulado",
});

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioApp | null>(null);
  const [cargando, setCargando] = useState(true);
  const [motivoBloqueo, setMotivoBloqueo] = useState<string | null>(null);
  const modoAcceso: ContextoSesion["modoAcceso"] = obtener_modo_acceso_actual();

  useEffect(() => {
    let activo = true;
    let timeoutId: number | undefined;
    let esperandoConfirmacionAuth = false;

    if (modoAcceso === "simulado") {
      const resolverSesionLocal = async () => {
        const resultado = await obtener_usuario_actual();

        if (!activo) {
          return;
        }

        setUsuario(resultado);
        setMotivoBloqueo(resultado ? null : "Inicia sesión para acceder al panel.");
        setCargando(false);
      };

      void resolverSesionLocal();

      const desuscribirSesionLocal = observar_sesion_local(() => {
        if (!activo) {
          return;
        }

        setCargando(true);
        void resolverSesionLocal();
      });

      return () => {
        activo = false;
        desuscribirSesionLocal();
      };
    }

    const resolverSesion = async (usuarioAuth: { uid: string; correo: string } | null) => {
      if (!activo) {
        return;
      }

      try {
        if (!usuarioAuth) {
          setUsuario(null);
          setMotivoBloqueo((actual) => actual ?? "Inicia sesión para acceder al panel institucional.");
          setCargando(false);
          return;
        }

        const respuesta = await fetch("/api/auth/sesion", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uid: usuarioAuth.uid,
            correo: usuarioAuth.correo,
          }),
        });

        const datos = (await respuesta.json()) as {
          ok?: boolean;
          mensaje?: string;
          usuario?: UsuarioApp | null;
          motivo?: "ok" | "sin_perfil" | "sin_admin_sdk" | "pendiente_registro" | "bloqueado";
        };

        if (!activo) {
          return;
        }

        if (!respuesta.ok || datos.ok === false) {
          setUsuario(null);
          setMotivoBloqueo(datos.mensaje ?? "No se pudo validar tu sesión institucional.");
          setCargando(false);
          return;
        }

        if (!datos.usuario) {
          setUsuario(null);
          setMotivoBloqueo(
            datos.motivo === "sin_admin_sdk"
              ? "Faltan credenciales de Firebase Admin para validar el perfil institucional en el servidor."
              : "Tu cuenta Firebase no tiene un perfil institucional válido en SACE.",
          );
          setCargando(false);
          return;
        }

        setUsuario(datos.usuario);

        if (datos.motivo === "bloqueado") {
          setMotivoBloqueo("Tu perfil institucional está bloqueado. Contacta a administración.");
        } else if (datos.motivo === "pendiente_registro") {
          setMotivoBloqueo("Tu acceso está pendiente de aprobación administrativa.");
        } else {
          setMotivoBloqueo(null);
        }

        setCargando(false);
      } catch (error) {
        if (!activo) {
          return;
        }

        setUsuario(null);
        setMotivoBloqueo(
          error instanceof Error
            ? `No se pudo resolver la sesión: ${error.message}`
            : "No se pudo resolver la sesión institucional.",
        );
        setCargando(false);
      }
    };

    const iniciar = async () => {
      const sesionCredenciales = obtener_sesion_credenciales_local();

      if (sesionCredenciales) {
        const usuarioLocal = await obtener_usuario_actual();

        if (!activo) {
          return;
        }

        setUsuario(usuarioLocal);
        setMotivoBloqueo(null);
        setCargando(false);
        return () => undefined;
      }

      const resultadoEnlace = await completar_acceso_magic_link();

      if (!activo) {
        return;
      }

      if (resultadoEnlace.error) {
        setUsuario(null);
        setMotivoBloqueo(resultadoEnlace.error);
      }

      const cliente = obtenerFirebaseCliente();
      if (cliente?.auth.authStateReady) {
        await cliente.auth.authStateReady();
      }

      if (!activo) {
        return;
      }

      const usuarioActual = cliente?.auth.currentUser;
      esperandoConfirmacionAuth = resultadoEnlace.completado || Boolean(usuarioActual);

      if (usuarioActual?.email) {
        void resolverSesion({ uid: usuarioActual.uid, correo: usuarioActual.email });
      }

      if (esperandoConfirmacionAuth) {
        timeoutId = window.setTimeout(() => {
          if (!activo) {
            return;
          }

          const usuarioDemorado = obtenerFirebaseCliente()?.auth.currentUser;

          if (usuarioDemorado?.email) {
            void resolverSesion({ uid: usuarioDemorado.uid, correo: usuarioDemorado.email });
            return;
          }

          esperandoConfirmacionAuth = false;
          setUsuario(null);
          setMotivoBloqueo("No se pudo confirmar la sesión con Firebase. Intenta entrar de nuevo.");
          setCargando(false);
        }, 4000);
      }

      const desuscribir = observar_estado_auth((usuarioAuth) => {
        if (!activo) {
          return;
        }

        if (!usuarioAuth) {
          const usuarioPersistido = obtenerFirebaseCliente()?.auth.currentUser;

          if (usuarioPersistido?.email) {
            if (timeoutId) {
              window.clearTimeout(timeoutId);
            }

            esperandoConfirmacionAuth = false;
            void resolverSesion({ uid: usuarioPersistido.uid, correo: usuarioPersistido.email });
            return;
          }

          if (esperandoConfirmacionAuth) {
            return;
          }
        }

        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }

        esperandoConfirmacionAuth = false;
        void resolverSesion(usuarioAuth);
      });

      return desuscribir;
    };

    let limpieza: (() => void) | undefined;

    void iniciar()
      .then((resultado) => {
        limpieza = resultado;
      })
      .catch((error) => {
        if (!activo) {
          return;
        }

        setUsuario(null);
        setMotivoBloqueo(
          error instanceof Error
            ? `No se pudo iniciar la sesión institucional: ${error.message}`
            : "No se pudo iniciar la sesión institucional.",
        );
        setCargando(false);
      });

    return () => {
      activo = false;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      limpieza?.();
    };
  }, [modoAcceso]);

  const valor: ContextoSesion = useMemo(
    () => ({
      usuario,
      cargando,
      puedeAccederPanel: Boolean(usuario && usuario.estado === "activo"),
      motivoBloqueo,
      modoAcceso,
    }),
    [usuario, cargando, motivoBloqueo, modoAcceso],
  );

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion() {
  return useContext(SesionContext);
}
