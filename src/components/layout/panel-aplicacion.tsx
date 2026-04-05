"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Database, GraduationCap, KeyRound, LayoutGrid, LogOut, ShieldCheck, UserCheck, Users } from "lucide-react";
import { Boton } from "@/components/ui/boton";
import { cerrar_sesion } from "@/lib/auth/acciones";
import { useSesion } from "@/lib/auth/proveedor-sesion";
import { cn } from "@/lib/utils/cn";

const navegacion = [
  { href: "/dashboard", etiqueta: "Dashboard", icono: LayoutGrid },
];

const navegacionConfiguracion = [
  { href: "/configuracion/clave", etiqueta: "Cambiar contraseña", icono: KeyRound, soloAdmin: false },
  { href: "/docentes", etiqueta: "Cambio de rol", icono: Users, soloAdmin: true },
  { href: "/administracion/aprobaciones", etiqueta: "Aprobaciones", icono: UserCheck, soloAdmin: true },
  { href: "/administracion/importacion", etiqueta: "Importación", icono: Database, soloAdmin: true },
];

export function PanelAplicacion({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { usuario, cargando, puedeAccederPanel, motivoBloqueo } = useSesion();
  const esAdmin = usuario?.rol === "admin";
  const navegacionVisible = navegacion;
  const [configuracionAbierta, setConfiguracionAbierta] = useState(false);

  useEffect(() => {
    if (!cargando && !puedeAccederPanel) {
      router.replace("/login");
    }
  }, [cargando, puedeAccederPanel, router]);

  const cerrarSesionActual = async () => {
    await cerrar_sesion();
    window.location.assign("/login");
  };

  if (cargando) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-12">
        <div className="superficie w-full rounded-[2rem] p-8 md:p-10">
          <div className="flex flex-col gap-8 md:grid md:grid-cols-[1.2fr_0.8fr] md:items-end">
            <div className="space-y-4">
              <p className="text-[var(--tamano-ui)] font-medium text-[var(--color-acento)]">
                SACE
              </p>
              <h1 className="titular-editorial text-[var(--tamano-ui)] leading-[1.5] font-medium">Cargando sesión</h1>
              <p className="max-w-2xl text-[var(--tamano-ui)] leading-[1.5] texto-suave">
                Verificamos autenticación, perfil institucional y permisos antes de abrir el panel.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-[var(--color-borde-suave)] bg-[var(--color-superficie-secundaria)] p-5">
              <p className="text-[var(--tamano-ui)] font-medium text-[var(--color-texto-suave)]">
                Estado
              </p>
              <p className="mt-3 text-[var(--tamano-ui)] font-medium text-[var(--color-texto)]">Preparando acceso</p>
              <p className="mt-2 text-[var(--tamano-ui)] leading-[1.5] texto-suave">Un momento.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!puedeAccederPanel) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-12">
        <div className="superficie w-full rounded-[2rem] p-8 md:p-10">
          <div className="flex flex-col gap-8 md:grid md:grid-cols-[1.15fr_0.85fr] md:items-end">
            <div className="space-y-4">
              <p className="text-[var(--tamano-ui)] font-medium text-[var(--color-peligro)]">
                Acceso restringido
              </p>
              <h1 className="titular-editorial text-[var(--tamano-ui)] leading-[1.5] font-medium">Perfil institucional requerido</h1>
              <p className="max-w-2xl text-[var(--tamano-ui)] leading-[1.5] texto-suave">
                {motivoBloqueo ?? "Debes iniciar sesión para acceder al panel institucional."}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-[rgba(181,66,45,0.12)] bg-[rgba(181,66,45,0.04)] p-5">
              <p className="text-[var(--tamano-ui)] font-medium text-[var(--color-peligro)]">
                Acceso
              </p>
              <p className="mt-3 text-[var(--tamano-ui)] font-medium">No tienes acceso al panel</p>
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
    <div className="min-h-screen md:grid md:grid-cols-[228px_minmax(0,1fr)]">
      <aside className="panel-lateral flex flex-col gap-5 px-4 py-4 md:sticky md:top-0 md:h-screen md:px-4 md:py-5">
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="inline-flex w-fit max-w-full items-center gap-2 px-1 py-1">
              <ShieldCheck className="size-4 text-[var(--color-acento)]" />
              <span className="text-[var(--tamano-ui)] font-medium text-[var(--color-acento)]">SACE</span>
            </div>
          </div>

          <div className="space-y-2">
            <nav className="space-y-0.5">
            {navegacionVisible.map((item) => {
              const Activo = item.icono;
              const seleccionada = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[0.95rem] px-3 py-2 text-[var(--tamano-ui)] font-medium transition",
                    seleccionada
                      ? "bg-white/85 text-[var(--color-texto)] shadow-[0_8px_24px_rgba(20,34,46,0.05)]"
                      : "text-[var(--color-texto-suave)] hover:bg-white/60 hover:text-[var(--color-texto)]",
                  )}
                >
                  <Activo className="size-3.5" />
                  <span className="truncate">{item.etiqueta}</span>
                </Link>
              );
            })}
            </nav>

            <button
              type="button"
              className="flex w-full items-center justify-between rounded-[0.95rem] px-3 pt-3 pb-2 text-left text-[var(--tamano-ui)] font-medium text-[var(--color-texto-suave)] transition hover:text-[var(--color-texto)]"
              onClick={() => setConfiguracionAbierta((actual) => !actual)}
              aria-expanded={configuracionAbierta}
              aria-controls="menu-configuracion"
            >
              <span>Configuración</span>
              <ChevronDown
                className={cn(
                  "size-4 transition-transform",
                  configuracionAbierta ? "rotate-180" : "rotate-0",
                )}
              />
            </button>

            {configuracionAbierta ? (
              <nav id="menu-configuracion" className="space-y-0.5">
                {navegacionConfiguracion.map((item) => {
                  if (item.soloAdmin && !esAdmin) {
                    return null;
                  }

                  const Activo = item.icono;
                  const seleccionada = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-[0.95rem] px-3 py-2 text-[var(--tamano-ui)] font-medium transition",
                        seleccionada
                          ? "bg-white/85 text-[var(--color-texto)] shadow-[0_8px_24px_rgba(20,34,46,0.05)]"
                          : "text-[var(--color-texto-suave)] hover:bg-white/60 hover:text-[var(--color-texto)]",
                      )}
                    >
                      <Activo className="size-3.5" />
                      <span className="truncate">{item.etiqueta}</span>
                    </Link>
                  );
                })}
              </nav>
            ) : null}
          </div>
        </div>

        <div className="mt-auto space-y-3 px-3 pb-1">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 rounded-full bg-[rgba(27,97,118,0.1)] p-2 text-[var(--color-acento)]">
              <GraduationCap className="size-3.5" />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="break-words text-[var(--tamano-ui)] font-medium leading-[1.5] text-[var(--color-texto)]">
                {usuario ? `${usuario.nombres} ${usuario.apellidos}` : "Sin sesión"}
              </p>
              <p
                className="overflow-hidden text-ellipsis whitespace-nowrap text-[var(--tamano-ui)] leading-[1.5] texto-suave"
                title={usuario?.correo ?? "Sin correo configurado"}
              >
                {usuario?.correo ?? "Sin correo configurado"}
              </p>
            </div>
          </div>

          <Boton
            className="w-full justify-start rounded-[0.95rem] px-3 py-2"
            variante="fantasma"
            type="button"
            onClick={cerrarSesionActual}
          >
            <LogOut className="mr-2 size-3.5" />
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
