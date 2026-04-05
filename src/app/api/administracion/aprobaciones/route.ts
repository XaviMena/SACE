import { NextResponse } from "next/server";
import {
  es_admin_servidor,
  listar_solicitudes_acceso_docentes_servidor,
} from "@/lib/repositorios/usuarios-servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const uid = request.headers.get("x-sace-uid");

  if (!uid) {
    return NextResponse.json(
      { ok: false, mensaje: "Falta el identificador del administrador." },
      { status: 401 },
    );
  }

  if (!(await es_admin_servidor(uid))) {
    return NextResponse.json(
      { ok: false, mensaje: "No tienes permisos para revisar aprobaciones." },
      { status: 403 },
    );
  }

  try {
    const solicitudes = await listar_solicitudes_acceso_docentes_servidor();

    return NextResponse.json({
      ok: true,
      solicitudes,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        mensaje: error instanceof Error ? error.message : "No se pudieron cargar las solicitudes.",
      },
      { status: 500 },
    );
  }
}
