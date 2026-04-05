import { FormularioAcceso } from "@/components/formularios/formulario-acceso";
import { obtener_estado_firebase } from "@/lib/firebase/config";
import { GraduationCap } from "lucide-react";

export default function PaginaLogin() {
  const firebase = obtener_estado_firebase();

  return (
    <main className="fondo-login mx-auto flex min-h-screen w-full items-center justify-center px-6 py-10">
      <section className="w-full max-w-[28rem]">
        <div className="space-y-8 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-[1.4rem] bg-[var(--color-superficie-secundaria)] shadow-[0_10px_26px_rgba(20,34,46,0.05)]">
            <GraduationCap className="size-8 text-[var(--color-secundario)]" />
          </div>

          <div className="space-y-3">
            <p className="titular-editorial text-6xl leading-none font-extrabold tracking-[-0.055em] text-[var(--color-texto)] sm:text-7xl">
              SACE
            </p>
            <h1 className="text-[13px] font-medium tracking-[0.18em] text-[var(--color-secundario)] uppercase">
              Sistema Automatizado de Gestión Escolar
            </h1>
          </div>

          <div className="panel-auth rounded-[1.8rem] px-6 py-6 text-left sm:px-7">
            <FormularioAcceso />
          </div>

          <p className="text-[12px] text-[var(--color-neutral)]">
            {firebase.configurado ? "Conectado" : "Modo local"}
          </p>
        </div>
      </section>
    </main>
  );
}
