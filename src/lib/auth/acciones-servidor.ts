"use server";

import { resolver_usuario_autenticado } from "@/lib/repositorios/usuarios";
import type { UsuarioApp } from "@/types/auth";

export interface ResultadoResolucionSesion {
  usuario: UsuarioApp | null;
  motivo: "ok" | "sin_perfil" | "bloqueado";
}

export async function resolver_usuario_autenticado_accion(uid: string, correo: string): Promise<ResultadoResolucionSesion> {
  const usuario = await resolver_usuario_autenticado(uid, correo);

  if (!usuario) {
    return {
      usuario: null,
      motivo: "sin_perfil",
    };
  }

  if (usuario.estado === "bloqueado") {
    return {
      usuario,
      motivo: "bloqueado",
    };
  }

  return {
    usuario,
    motivo: "ok",
  };
}
