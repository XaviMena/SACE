import { FormularioAccesoDinamico } from "@/components/formularios/formulario-acceso-dinamico";
import { obtener_estado_firebase } from "@/lib/firebase/config";
import { GraduationCap } from "lucide-react";

export default function PaginaLogin() {
  const firebase = obtener_estado_firebase();

  return (
    <main className="fondo-login mx-auto flex min-h-screen w-full items-center justify-center px-6 py-6">
      <section className="w-full max-w-[28rem]">
        <div className="space-y-5 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-[1.2rem] bg-[var(--color-superficie-secundaria)] shadow-[0_10px_22px_rgba(20,34,46,0.05)]">
            <GraduationCap className="size-7 text-[var(--color-secundario)]" />
          </div>

          <div className="space-y-1.5">
            <p className="titular-editorial text-[clamp(1.7rem,3vw,2rem)] leading-[1.1] font-medium tracking-0 text-[var(--color-texto)]">
              SACE
            </p>
            <h1 className="mx-auto max-w-[24rem] text-[1rem] leading-[1.35] font-medium text-[var(--color-secundario)] sm:text-[1.05rem]">
              Sistema Automatizado de Gestión Escolar
            </h1>
          </div>

          <div className="panel-auth rounded-[1.6rem] px-5 py-5 text-left sm:px-6">
            <FormularioAccesoDinamico />
          </div>

          <p className="text-[var(--tamano-ui)] text-[var(--color-neutral)]">
            {firebase.configurado ? "Conectado" : firebase.forzadoSimulado ? "Modo local forzado" : "Modo local"}
          </p>
        </div>
      </section>
    </main>
  );
}
