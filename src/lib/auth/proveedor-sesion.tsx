"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { UsuarioApp } from "@/types/auth";
import {
  completar_acceso_magic_link,
  obtener_modo_acceso_actual,
  observar_estado_auth,
  obtener_usuario_actual,
} from "@/lib/auth/acciones";
import { obtener_usuario_por_uid, registrar_ultimo_acceso_usuario } from "@/lib/repositorios/usuarios";

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

    if (modoAcceso === "simulado") {
      void obtener_usuario_actual()
        .then((resultado) => {
          if (!activo) {
            return;
          }

          setUsuario(resultado);
          setMotivoBloqueo(null);
        })
        .finally(() => {
          if (activo) {
            setCargando(false);
          }
        });

      return () => {
        activo = false;
      };
    }

    const iniciar = async () => {
      const resultadoEnlace = await completar_acceso_magic_link();

      if (!activo) {
        return;
      }

      if (resultadoEnlace.error) {
        setUsuario(null);
        setMotivoBloqueo(resultadoEnlace.error);
      }

      const desuscribir = observar_estado_auth(async (usuarioAuth) => {
        if (!activo) {
          return;
        }

        if (!usuarioAuth) {
          setUsuario(null);
          setMotivoBloqueo((actual) => actual ?? "Inicia sesión para acceder al panel institucional.");
          setCargando(false);
          return;
        }

        const usuario = await obtener_usuario_por_uid(usuarioAuth.uid);

        if (!activo) {
          return;
        }

        if (!usuario) {
          setUsuario(null);
          setMotivoBloqueo("Tu cuenta Firebase no tiene un perfil institucional válido en SACE.");
          setCargando(false);
          return;
        }

        const usuarioActualizado = await registrar_ultimo_acceso_usuario(usuarioAuth.uid, usuarioAuth.correo);

        if (!activo) {
          return;
        }

        setUsuario(usuarioActualizado ?? usuario);

        if (usuario.estado === "bloqueado") {
          setMotivoBloqueo("Tu perfil institucional está bloqueado. Contacta a administración.");
        } else {
          setMotivoBloqueo(null);
        }

        setCargando(false);
      });

      return desuscribir;
    };

    let limpieza: (() => void) | undefined;

    void iniciar().then((resultado) => {
      limpieza = resultado;
    });

    return () => {
      activo = false;
      limpieza?.();
    };
  }, [modoAcceso]);

  const valor: ContextoSesion = useMemo(
    () => ({
      usuario,
      cargando,
      puedeAccederPanel: Boolean(usuario && usuario.estado !== "bloqueado"),
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
