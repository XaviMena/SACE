import { NextResponse } from "next/server";
import { autenticar_credenciales_servidor } from "@/lib/repositorios/usuarios-servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const cuerpo = (await request.json()) as {
      correo?: string;
      contrasena?: string;
    };

    if (!cuerpo.correo || !cuerpo.contrasena) {
      return NextResponse.json(
        { ok: false, mensaje: "Completa el correo y la contraseña." },
        { status: 400 },
      );
    }

    const resultado = await autenticar_credenciales_servidor(cuerpo.correo, cuerpo.contrasena);

    return NextResponse.json(resultado, { status: resultado.ok ? 200 : 401 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        mensaje: error instanceof Error ? error.message : "No se pudo validar el acceso.",
        usuario: null,
      },
      { status: 500 },
    );
  }
}
