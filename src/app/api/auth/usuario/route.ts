import { NextResponse } from "next/server";
import { obtener_usuario_para_sesion_servidor } from "@/lib/repositorios/usuarios-servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const cuerpo = (await request.json()) as {
      uid?: string;
    };

    if (!cuerpo.uid) {
      return NextResponse.json(
        { ok: false, mensaje: "Falta el identificador del usuario.", usuario: null },
        { status: 400 },
      );
    }

    const usuario = await obtener_usuario_para_sesion_servidor(cuerpo.uid);

    return NextResponse.json({
      ok: Boolean(usuario),
      usuario,
      mensaje: usuario ? null : "No se encontró una sesión válida.",
    }, { status: usuario ? 200 : 404 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        mensaje: error instanceof Error ? error.message : "No se pudo obtener el usuario actual.",
        usuario: null,
      },
      { status: 500 },
    );
  }
}
