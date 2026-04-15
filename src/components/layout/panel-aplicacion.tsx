"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, GraduationCap, LogOut, ShieldCheck } from "lucide-react";
import { Boton } from "@/components/ui/boton";
import { cerrar_sesion } from "@/lib/auth/acciones";
import { useSesion } from "@/lib/auth/proveedor-sesion";
import { cn } from "@/lib/utils/cn";
import {
  GRUPOS_MENU_PANEL,
  ITEMS_MENU_PANEL,
  item_menu_visible,
  ruta_esta_activa,
  type GrupoMenuPanel,
} from "@/components/layout/menu-panel";

export function PanelAplicacion({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { usuario, cargando, puedeAccederPanel, motivoBloqueo } = useSesion();
  const rolUsuario = usuario?.rol ?? null;

  const dashboard = useMemo(
    () => ITEMS_MENU_PANEL.find((item) => item.grupo === "dashboard" && item_menu_visible(item, rolUsuario)) ?? null,
    [rolUsuario],
  );

  const gruposVisibles = useMemo(
    () =>
      GRUPOS_MENU_PANEL.map((grupo) => ({
        ...grupo,
        items: ITEMS_MENU_PANEL.filter(
          (item) => item.grupo === grupo.id && !item.esPersonal && item_menu_visible(item, rolUsuario),
        ),
      })).filter((grupo) => grupo.items.length > 0),
    [rolUsuario],
  );

  const itemsPersonales = useMemo(
    () => ITEMS_MENU_PANEL.filter((item) => item.esPersonal && item_menu_visible(item, rolUsuario)),
    [rolUsuario],
  );

  const [gruposAbiertos, setGruposAbiertos] = useState<Partial<Record<GrupoMenuPanel, boolean>>>({});

  useEffect(() => {
    if (!cargando && !puedeAccederPanel) {
      router.replace("/login");
    }
  }, [cargando, puedeAccederPanel, router]);

  const cerrarSesionActual = async () => {
    await cerrar_sesion();
    window.location.assign("/login");
  };

  const DashboardIcono = dashboard?.icono;

  const clasesItemMenu =
    "nav-item-compacto flex items-center gap-2 text-[var(--tamano-ui)] font-medium transition";

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
      <aside className="panel-lateral flex flex-col gap-3 px-3 py-3 md:sticky md:top-0 md:h-screen md:overflow-hidden md:px-3 md:py-3">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <div className="space-y-2">
            <div className="inline-flex w-fit max-w-full items-center gap-2 px-0.5 py-0.5">
              <ShieldCheck className="size-4 text-[var(--color-acento)]" />
              <span className="text-[var(--tamano-ui)] font-medium text-[var(--color-acento)]">SACE</span>
            </div>
          </div>

          <div className="space-y-3">
            {dashboard && dashboard.href ? (
              <nav className="space-y-0.5">
                {DashboardIcono ? (
                  <Link
                    key={dashboard.href}
                    href={dashboard.href}
                    className={cn(
                      clasesItemMenu,
                      "nav-item-activo",
                      ruta_esta_activa(pathname, dashboard.href)
                        ? ""
                        : "nav-item-inactivo bg-transparent shadow-none",
                    )}
                  >
                    <DashboardIcono className="size-3.5" />
                    <span className="truncate">{dashboard.etiqueta}</span>
                  </Link>
                ) : null}
              </nav>
            ) : null}

            {gruposVisibles.length ? (
              <div className="space-y-1.5">
                {gruposVisibles.map((grupo) => {
                  const grupoActivo = grupo.items.some((item) => ruta_esta_activa(pathname, item.href));
                  const abierta = gruposAbiertos[grupo.id] ?? grupoActivo;

                  return (
                    <div key={grupo.id} className="nav-grupo-compacto">
                      <button
                        type="button"
                        className={cn(
                          "nav-toggle-compacto flex w-full items-center justify-between text-left text-[var(--tamano-ui)] font-medium transition",
                          grupoActivo
                            ? "text-[var(--color-texto)]"
                            : "text-[var(--color-texto-suave)] hover:bg-white/0 hover:text-[var(--color-texto)]",
                        )}
                        onClick={() =>
                          setGruposAbiertos((actual) => ({
                            ...actual,
                            [grupo.id]: !abierta,
                          }))
                        }
                        aria-expanded={abierta}
                        aria-controls={`menu-${grupo.id}`}
                      >
                        <span>{grupo.etiqueta}</span>
                        <ChevronDown
                          className={cn(
                            "size-4 transition-transform",
                            abierta ? "rotate-180" : "rotate-0",
                          )}
                        />
                      </button>

                      {abierta ? (
                        <nav id={`menu-${grupo.id}`} className="space-y-0.5">
                          {grupo.items.map((item) => {
                            const Activo = item.icono;
                            const seleccionada = ruta_esta_activa(pathname, item.href);
                            const contenido = (
                              <>
                                <Activo className="size-3.5" />
                                <span className="truncate">{item.etiqueta}</span>
                              </>
                            );

                            if (!item.href) {
                              return (
                                <div
                                  key={`${grupo.id}-${item.etiqueta}`}
                                  className={cn(
                                    clasesItemMenu,
                                    "nav-item-bloqueado",
                                  )}
                                  aria-disabled="true"
                                >
                                  {contenido}
                                </div>
                              );
                            }

                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                  clasesItemMenu,
                                  "nav-item-activo",
                                  seleccionada
                                    ? ""
                                    : "nav-item-inactivo bg-transparent shadow-none",
                                )}
                              >
                                {contenido}
                              </Link>
                            );
                          })}
                        </nav>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}

            {itemsPersonales.length ? (
              <div className="space-y-1 border-t border-[var(--color-borde-suave)] pt-2.5">
                <p className="px-2 text-[var(--tamano-ui)] font-medium text-[var(--color-texto-suave)]">
                  Mi cuenta
                </p>
                <nav className="space-y-0.5">
                  {itemsPersonales.map((item) => {
                    if (!item.href) {
                      return null;
                    }

                    const Activo = item.icono;
                    const seleccionada = ruta_esta_activa(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          clasesItemMenu,
                          "nav-item-activo",
                          seleccionada
                            ? ""
                            : "nav-item-inactivo bg-transparent shadow-none",
                        )}
                      >
                        <Activo className="size-3.5" />
                        <span className="truncate">{item.etiqueta}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-auto space-y-1.5 px-2 pb-1">
          <div className="tarjeta-usuario flex items-start gap-2 px-0.5 py-1">
            <div className="mt-0.5 rounded-full bg-[rgba(27,97,118,0.08)] p-1.5 text-[var(--color-acento)]">
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
            className="w-full justify-start px-0.5 text-[var(--color-acento)] hover:bg-transparent"
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
