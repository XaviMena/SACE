import { NextResponse } from "next/server";
import { obtenerFirebaseAdmin } from "@/lib/firebase/admin";
import { obtener_dashboard_por_usuario } from "@/lib/repositorios/dashboard-servidor";
import { obtener_usuario_activo_servidor } from "@/lib/repositorios/usuarios-servidor";
import { usuarioAdminSemilla } from "@/lib/repositorios/datos-semilla";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const uid = request.headers.get("x-sace-uid");

  if (!uid) {
    return NextResponse.json({ ok: false, mensaje: "Falta el identificador del usuario." }, { status: 401 });
  }

  const usuario = uid === usuarioAdminSemilla.uid
    ? usuarioAdminSemilla
    : obtenerFirebaseAdmin()
      ? await obtener_usuario_activo_servidor(uid)
      : null;

  if (!usuario) {
    return NextResponse.json({ ok: false, mensaje: "No tienes permisos para consultar el dashboard." }, { status: 403 });
  }

  const dashboard = await obtener_dashboard_por_usuario(usuario);

  return NextResponse.json({
    ok: true,
    dashboard,
  });
}
