import { NextResponse } from "next/server";
import { resolver_usuario_autenticado_accion } from "@/lib/auth/acciones-servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const cuerpo = (await request.json()) as {
      uid?: string;
      correo?: string;
    };

    if (!cuerpo.uid || !cuerpo.correo) {
      return NextResponse.json(
        { ok: false, mensaje: "Faltan datos para resolver la sesión." },
        { status: 400 },
      );
    }

    const resultado = await resolver_usuario_autenticado_accion(cuerpo.uid, cuerpo.correo);

    return NextResponse.json({
      ok: true,
      ...resultado,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        mensaje: error instanceof Error ? error.message : "No se pudo resolver la sesión.",
      },
      { status: 500 },
    );
  }
}
