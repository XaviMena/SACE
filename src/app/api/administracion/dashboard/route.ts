import { NextResponse } from "next/server";
import { obtenerFirebaseAdmin } from "@/lib/firebase/admin";
import { obtener_resumen_dashboard_admin, es_admin_semilla } from "@/lib/repositorios/dashboard-servidor";
import { es_admin_servidor } from "@/lib/repositorios/usuarios-servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const uidAdmin = request.headers.get("x-sace-uid");

  if (!uidAdmin) {
    return NextResponse.json({ ok: false, mensaje: "Falta el identificador del administrador." }, { status: 401 });
  }

  const autorizado = obtenerFirebaseAdmin() ? await es_admin_servidor(uidAdmin) : es_admin_semilla(uidAdmin);

  if (!autorizado) {
    return NextResponse.json({ ok: false, mensaje: "No tienes permisos para consultar el dashboard." }, { status: 403 });
  }

  const resumen = await obtener_resumen_dashboard_admin();

  return NextResponse.json({
    ok: true,
    resumen,
  });
}
