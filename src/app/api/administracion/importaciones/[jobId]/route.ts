import { NextResponse } from "next/server";
import { obtener_estado_importacion } from "@/lib/importaciones/estado-importacion";
import { es_admin_servidor } from "@/lib/repositorios/usuarios-servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ jobId: string }> }) {
  const uidAdmin = request.headers.get("x-sace-uid");

  if (!uidAdmin) {
    return NextResponse.json({ ok: false, mensaje: "Falta el identificador del administrador." }, { status: 401 });
  }

  if (!(await es_admin_servidor(uidAdmin))) {
    return NextResponse.json({ ok: false, mensaje: "No tienes permisos para consultar esta importación." }, { status: 403 });
  }

  const { jobId } = await context.params;
  const estado = obtener_estado_importacion(jobId);

  if (!estado) {
    return NextResponse.json({ ok: false, mensaje: "No se encontró la importación solicitada." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    estado,
  });
}
