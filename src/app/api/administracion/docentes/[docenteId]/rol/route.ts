import { NextResponse } from "next/server";
import { actualizar_rol_docente_servidor, es_admin_servidor } from "@/lib/repositorios/usuarios-servidor";
import type { RolUsuario } from "@/types/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ docenteId: string }> },
) {
  const uidAdmin = request.headers.get("x-sace-uid");

  if (!uidAdmin) {
    return NextResponse.json({ ok: false, mensaje: "Falta el identificador del administrador." }, { status: 401 });
  }

  if (!(await es_admin_servidor(uidAdmin))) {
    return NextResponse.json({ ok: false, mensaje: "No tienes permisos para cambiar roles." }, { status: 403 });
  }

  try {
    const { docenteId } = await context.params;
    const cuerpo = (await request.json()) as { rol?: RolUsuario };
    const rolSeleccionado = cuerpo.rol;

    if (
      rolSeleccionado !== "admin" &&
      rolSeleccionado !== "docente" &&
      rolSeleccionado !== "autoridad" &&
      rolSeleccionado !== "dece"
    ) {
      return NextResponse.json({ ok: false, mensaje: "Selecciona un rol válido." }, { status: 400 });
    }

    const usuario = await actualizar_rol_docente_servidor(docenteId, rolSeleccionado);

    const mensajesPorRol = {
      admin: "El acceso quedó como Administrador.",
      docente: "El acceso quedó como Docente.",
      autoridad: "El acceso quedó como Autoridad.",
      dece: "El acceso quedó como DECE.",
    } as const;

    return NextResponse.json({
      ok: true,
      usuario,
      mensaje: mensajesPorRol[rolSeleccionado],
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        mensaje: error instanceof Error ? error.message : "No se pudo actualizar el rol del docente.",
      },
      { status: 500 },
    );
  }
}
