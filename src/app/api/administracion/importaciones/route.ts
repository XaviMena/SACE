import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { crear_estado_importacion } from "@/lib/importaciones/estado-importacion";
import { ejecutar_importacion_sqlite } from "@/lib/importaciones/sqlite";
import { obtenerFirebaseAdmin } from "@/lib/firebase/admin";
import { es_admin_servidor } from "@/lib/repositorios/usuarios-servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!obtenerFirebaseAdmin()) {
    return NextResponse.json(
      {
        ok: false,
        mensaje: "Faltan credenciales de Firebase Admin en el servidor para ejecutar importaciones.",
      },
      { status: 500 },
    );
  }

  const uidAdmin = request.headers.get("x-sace-uid");

  if (!uidAdmin) {
    return NextResponse.json({ ok: false, mensaje: "Falta el identificador del administrador." }, { status: 401 });
  }

  if (!(await es_admin_servidor(uidAdmin))) {
    return NextResponse.json({ ok: false, mensaje: "No tienes permisos para iniciar importaciones." }, { status: 403 });
  }

  const formData = await request.formData();
  const archivo = formData.get("archivo");

  if (!(archivo instanceof File)) {
    return NextResponse.json({ ok: false, mensaje: "Debes adjuntar un archivo SQLite válido." }, { status: 400 });
  }

  const nombre = archivo.name.toLowerCase();
  if (!nombre.endsWith(".db") && !nombre.endsWith(".sqlite")) {
    return NextResponse.json({ ok: false, mensaje: "El archivo debe ser .db o .sqlite." }, { status: 400 });
  }

  const jobId = randomUUID();
  crear_estado_importacion(jobId);
  const buffer = new Uint8Array(await archivo.arrayBuffer());

  setTimeout(() => {
    void ejecutar_importacion_sqlite(jobId, buffer);
  }, 0);

  return NextResponse.json({
    ok: true,
    job_id: jobId,
    mensaje: "La importación fue iniciada correctamente.",
  });
}
