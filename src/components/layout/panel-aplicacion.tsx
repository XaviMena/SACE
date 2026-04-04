"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, LayoutGrid, LogOut, ShieldCheck, Users } from "lucide-react";
import { Boton } from "@/components/ui/boton";
import { cerrar_sesion } from "@/lib/auth/acciones";
import { useSesion } from "@/lib/auth/proveedor-sesion";
import { cn } from "@/lib/utils/cn";

const navegacion = [
  { href: "/dashboard", etiqueta: "Dashboard", icono: LayoutGrid },
  { href: "/docentes", etiqueta: "Docentes", icono: Users },
];

export function PanelAplicacion({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { usuario, cargando, puedeAccederPanel, motivoBloqueo, modoAcceso } = useSesion();

  useEffect(() => {
    if (!cargando && modoAcceso === "firebase" && !puedeAccederPanel) {
      router.replace("/login");
    }
  }, [cargando, modoAcceso, puedeAccederPanel, router]);

  const cerrarSesionActual = async () => {
    await cerrar_sesion();
    router.replace("/login");
  };

  if (cargando) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-12">
        <div className="superficie w-full rounded-[2rem] p-8 md:p-10">
          <div className="flex flex-col gap-8 md:grid md:grid-cols-[1.2fr_0.8fr] md:items-end">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-acento)]">
                SACE
              </p>
              <h1 className="titular-editorial text-5xl leading-none font-medium">Cargando sesión</h1>
              <p className="max-w-2xl text-base leading-8 texto-suave">
                Verificamos autenticación, perfil institucional y permisos antes de abrir el panel.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-[var(--color-borde-suave)] bg-[var(--color-superficie-secundaria)] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-texto-suave)]">
                Estado
              </p>
              <p className="mt-3 text-lg font-semibold text-[var(--color-texto)]">Preparando acceso</p>
              <p className="mt-2 text-sm leading-6 texto-suave">Un momento.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (modoAcceso === "firebase" && !puedeAccederPanel) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-12">
        <div className="superficie w-full rounded-[2rem] p-8 md:p-10">
          <div className="flex flex-col gap-8 md:grid md:grid-cols-[1.15fr_0.85fr] md:items-end">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-peligro)]">
                Acceso restringido
              </p>
              <h1 className="titular-editorial text-5xl leading-none font-medium">Perfil institucional requerido</h1>
              <p className="max-w-2xl text-base leading-8 texto-suave">
                {motivoBloqueo ?? "No fue posible validar tu acceso al panel institucional."}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-[rgba(181,66,45,0.12)] bg-[rgba(181,66,45,0.04)] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-peligro)]">
                Acceso
              </p>
              <p className="mt-3 text-lg font-semibold">No tienes acceso al panel</p>
              <Boton className="mt-5 w-full" type="button" onClick={() => router.replace("/login")}>
                Ir al acceso
              </Boton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen md:grid md:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="panel-lateral flex flex-col gap-8 px-6 py-8">
        <div className="space-y-3">
          <div className="inline-flex w-fit max-w-full items-center gap-3 rounded-full border border-[rgba(22,93,115,0.16)] bg-white/80 px-4 py-2">
            <ShieldCheck className="size-4 text-[var(--color-acento)]" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-acento)]">
              Control Escolar
            </span>
          </div>
          <div>
            <p className="titular-editorial text-4xl font-medium">SACE</p>
            <p className="mt-2 max-w-[18rem] text-sm leading-6 text-[var(--color-texto)]">
              Sistema Automatizado de Gestión Escolar
            </p>
          </div>
        </div>

        <nav className="space-y-2">
          {navegacion.map((item) => {
            const Activo = item.icono;
            const seleccionada = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                  seleccionada
                    ? "bg-white text-[var(--color-texto)] shadow-[0_12px_24px_rgba(22,93,115,0.08)]"
                    : "text-[var(--color-texto-suave)] hover:bg-white/70 hover:text-[var(--color-texto)]",
                )}
              >
                <Activo className="size-4" />
                {item.etiqueta}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto superficie rounded-[1.5rem] p-5">
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-full bg-[rgba(22,93,115,0.1)] p-2 text-[var(--color-acento)]">
              <BookOpen className="size-4" />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="break-words text-sm font-semibold leading-5">
                {usuario ? `${usuario.nombres} ${usuario.apellidos}` : "Sin sesión"}
              </p>
              <p className="break-all text-[13px] leading-5 texto-suave">
                {usuario?.correo ?? "Sin correo configurado"}
              </p>
            </div>
          </div>
          <Boton className="mt-5 w-full" variante="secundaria" type="button" onClick={cerrarSesionActual}>
            <LogOut className="mr-2 size-4" />
            Cerrar sesión
          </Boton>
        </div>
      </aside>

      <main className="px-5 py-5 md:px-8 md:py-8">
        <div className="superficie min-h-[calc(100vh-2.5rem)] rounded-[2rem] p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
