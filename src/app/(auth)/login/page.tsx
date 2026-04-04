import { FormularioAcceso } from "@/components/formularios/formulario-acceso";
import { obtener_estado_firebase } from "@/lib/firebase/config";

export default function PaginaLogin() {
  const firebase = obtener_estado_firebase();
  const descripcionAcceso = firebase.configurado
    ? "Acceso con correo institucional."
    : "Acceso con correo institucional.";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-12">
      <section className="grid w-full gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-8 rounded-[2rem] border border-[var(--color-borde-suave)] bg-[rgba(255,253,248,0.82)] p-8 shadow-[0_22px_50px_rgba(28,38,55,0.07)]">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-acento)]">
              Acceso institucional
            </p>
            <h1 className="titular-editorial text-5xl leading-none font-medium text-[var(--color-texto)]">
              Sistema Automatizado de Gestión Escolar
            </h1>
            <p className="max-w-2xl text-base leading-8 texto-suave">{descripcionAcceso}</p>
          </div>
        </div>

        <aside className="superficie rounded-[2rem] p-8">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-acento)]">
              Ingresar
            </p>
            <h2 className="titular-editorial text-3xl leading-none font-medium">Acceso al panel</h2>
            <p className="text-sm leading-6 texto-suave">
              {firebase.configurado ? "Te enviaremos un enlace de acceso." : `Modo ${firebase.proyecto ? firebase.proyecto : "local"}.`}
            </p>
          </div>

          <div className="mt-8">
            <FormularioAcceso />
          </div>
        </aside>
      </section>
    </main>
  );
}
