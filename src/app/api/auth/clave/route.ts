import { NextResponse } from "next/server";
import { cambiar_clave_acceso_servidor } from "@/lib/repositorios/usuarios-servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const cuerpo = (await request.json()) as {
      uid?: string;
      clave_actual?: string;
      clave_nueva?: string;
      clave_confirmacion?: string;
    };

    if (!cuerpo.uid || !cuerpo.clave_actual || !cuerpo.clave_nueva || !cuerpo.clave_confirmacion) {
      return NextResponse.json(
        { ok: false, mensaje: "Completa la clave anterior, la nueva clave y su confirmación." },
        { status: 400 },
      );
    }

    await cambiar_clave_acceso_servidor(
      cuerpo.uid,
      cuerpo.clave_actual,
      cuerpo.clave_nueva,
      cuerpo.clave_confirmacion,
    );

    return NextResponse.json({
      ok: true,
      mensaje: "Tu clave de acceso fue actualizada correctamente.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        mensaje: error instanceof Error ? error.message : "No se pudo actualizar la clave de acceso.",
      },
      { status: 400 },
    );
  }
}
