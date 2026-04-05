"use server";

import { obtenerFirebaseAdmin } from "@/lib/firebase/admin";
import { resolver_usuario_autenticado_servidor } from "@/lib/repositorios/usuarios-servidor";
import type { UsuarioApp } from "@/types/auth";

export interface ResultadoResolucionSesion {
  usuario: UsuarioApp | null;
  motivo: "ok" | "sin_perfil" | "sin_admin_sdk" | "pendiente_registro" | "bloqueado";
}

export async function resolver_usuario_autenticado_accion(uid: string, correo: string): Promise<ResultadoResolucionSesion> {
  if (!obtenerFirebaseAdmin()) {
    return {
      usuario: null,
      motivo: "sin_admin_sdk",
    };
  }

  const usuario = await resolver_usuario_autenticado_servidor(uid, correo);

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

  if (usuario.estado === "pendiente_registro") {
    return {
      usuario,
      motivo: "pendiente_registro",
    };
  }

  return {
    usuario,
    motivo: "ok",
  };
}
