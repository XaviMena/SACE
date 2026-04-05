import { NextResponse } from "next/server";
import { normalizar_cedula, normalizar_correo } from "@/lib/validaciones/identidad";
import { registrar_solicitud_docente_servidor } from "@/lib/repositorios/usuarios-servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const cuerpo = (await request.json()) as {
      cedula?: string;
      correo?: string;
    };

    const cedula = normalizar_cedula(String(cuerpo.cedula ?? ""));
    const correo = normalizar_correo(String(cuerpo.correo ?? ""));

    if (cedula.length !== 10 || !correo) {
      return NextResponse.json(
        { ok: false, mensaje: "Completa la cédula y el correo institucional." },
        { status: 400 },
      );
    }

    const resultado = await registrar_solicitud_docente_servidor(cedula, correo);

    if (resultado.estado === "activo") {
      return NextResponse.json({
        ok: true,
        mensaje: "Tu acceso ya está habilitado. Puedes iniciar sesión con tu clave.",
      });
    }

    if (resultado.estado === "bloqueado") {
      return NextResponse.json({
        ok: false,
        mensaje: "Tu solicitud fue bloqueada. Comunícate con administración.",
      }, { status: 403 });
    }

    return NextResponse.json({
      ok: true,
      mensaje: "Tu solicitud fue enviada. Administración la revisará en breve.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        mensaje: error instanceof Error ? error.message : "No se pudo registrar la solicitud.",
      },
      { status: 500 },
    );
  }
}
