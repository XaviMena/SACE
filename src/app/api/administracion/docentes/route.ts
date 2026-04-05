import { NextResponse } from "next/server";
import { es_admin_servidor, listar_docentes_con_rol_servidor } from "@/lib/repositorios/usuarios-servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const uidAdmin = request.headers.get("x-sace-uid");

  if (!uidAdmin) {
    return NextResponse.json({ ok: false, mensaje: "Falta el identificador del administrador." }, { status: 401 });
  }

  if (!(await es_admin_servidor(uidAdmin))) {
    return NextResponse.json({ ok: false, mensaje: "No tienes permisos para consultar docentes." }, { status: 403 });
  }

  try {
    const docentes = await listar_docentes_con_rol_servidor();

    return NextResponse.json({
      ok: true,
      docentes,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        mensaje: error instanceof Error ? error.message : "No se pudo cargar la lista de docentes.",
      },
      { status: 500 },
    );
  }
}
