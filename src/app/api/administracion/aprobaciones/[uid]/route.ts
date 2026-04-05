import { NextResponse } from "next/server";
import {
  aprobar_solicitud_docente_servidor,
  bloquear_solicitud_docente_servidor,
  es_admin_servidor,
  eliminar_solicitud_docente_servidor,
  obtener_usuario_por_uid_servidor,
  revocar_aprobacion_docente_servidor,
} from "@/lib/repositorios/usuarios-servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ uid: string }> },
) {
  const uidAdmin = request.headers.get("x-sace-uid");

  if (!uidAdmin) {
    return NextResponse.json(
      { ok: false, mensaje: "Falta el identificador del administrador." },
      { status: 401 },
    );
  }

  if (!(await es_admin_servidor(uidAdmin))) {
    return NextResponse.json(
      { ok: false, mensaje: "No tienes permisos para actualizar solicitudes." },
      { status: 403 },
    );
  }

  try {
    const { uid } = await context.params;
    const cuerpo = (await request.json()) as { accion?: "aprobar" | "bloquear" | "eliminar" | "revocar" };

    if (!cuerpo.accion) {
      return NextResponse.json(
        { ok: false, mensaje: "Falta la acción a ejecutar." },
        { status: 400 },
      );
    }

    if (cuerpo.accion === "aprobar") {
      await aprobar_solicitud_docente_servidor(uid);
    } else if (cuerpo.accion === "revocar") {
      const usuarioObjetivo = await obtener_usuario_por_uid_servidor(uid);

      if (usuarioObjetivo?.uid === uidAdmin) {
        return NextResponse.json(
          { ok: false, mensaje: "No puedes revocar tu propia aprobación." },
          { status: 400 },
        );
      }

      await revocar_aprobacion_docente_servidor(uid);
    } else if (cuerpo.accion === "bloquear") {
      await bloquear_solicitud_docente_servidor(uid);
    } else {
      await eliminar_solicitud_docente_servidor(uid);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        mensaje: error instanceof Error ? error.message : "No se pudo actualizar la solicitud.",
      },
      { status: 500 },
    );
  }
}
