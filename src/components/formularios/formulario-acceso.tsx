"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, AtSign, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/boton";
import {
  completar_acceso_magic_link_con_correo,
  enviar_enlace_acceso,
  hay_magic_link_pendiente,
} from "@/lib/auth/acciones";
import { useSesion } from "@/lib/auth/proveedor-sesion";

const esquemaAcceso = z.object({
  correo: z.string().trim().toLowerCase().email("Ingresa un correo válido."),
});

type ValoresAcceso = z.infer<typeof esquemaAcceso>;

export function FormularioAcceso() {
  const router = useRouter();
  const { puedeAccederPanel, modoAcceso, motivoBloqueo } = useSesion();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [completandoEnlace, setCompletandoEnlace] = useState(false);
  const [enlacePendiente, setEnlacePendiente] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ValoresAcceso>({
    resolver: zodResolver(esquemaAcceso),
    defaultValues: {
      correo: "xavymena@gmail.com",
    },
  });

  useEffect(() => {
    if (puedeAccederPanel) {
      router.replace("/dashboard");
    }
  }, [puedeAccederPanel, router]);

  useEffect(() => {
    setEnlacePendiente(hay_magic_link_pendiente());
  }, []);

  const mostrarAvisoBloqueo =
    modoAcceso === "firebase" &&
    Boolean(motivoBloqueo) &&
    motivoBloqueo !== "Inicia sesión para acceder al panel institucional.";

  const onSubmit = handleSubmit(async ({ correo }) => {
    setEnviando(true);
    setMensaje(null);

    try {
      const resultado = await enviar_enlace_acceso(correo);
      setMensaje(resultado.mensaje);
    } finally {
      setEnviando(false);
    }
  });

  const completarEnlace = async () => {
    const correo = getValues("correo");
    setCompletandoEnlace(true);
    setMensaje(null);

    try {
      const resultado = await completar_acceso_magic_link_con_correo(correo);

      if (resultado.error) {
        setMensaje(resultado.error);
        return;
      }

      setMensaje("Enlace validado. Estamos ingresando al panel institucional.");
    } finally {
      setCompletandoEnlace(false);
    }
  };

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="space-y-2.5">
        <label className="block text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--color-neutral)]" htmlFor="correo">
          Correo institucional
        </label>
        <div className="relative">
          <AtSign className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-[var(--color-neutral)]" />
          <input
            id="correo"
            type="email"
            placeholder="nombre@institucion.edu.ec"
            className="w-full rounded-[1.15rem] border border-[rgba(215,222,227,0.95)] bg-white py-4 pr-4 pl-12 text-base text-[var(--color-texto)] shadow-[0_8px_24px_rgba(20,34,46,0.04)] outline-none transition placeholder:text-[rgba(99,114,129,0.58)] focus:border-[var(--color-acento)] focus:ring-3 focus:ring-[rgba(10,158,189,0.12)]"
            {...register("correo")}
          />
        </div>
        {errors.correo?.message ? (
          <p className="text-sm text-[var(--color-peligro)]">{errors.correo.message}</p>
        ) : enlacePendiente ? null : (
          <p className="text-sm texto-suave">Usa el correo registrado en el sistema.</p>
        )}
      </div>

      {enlacePendiente ? (
        <div className="rounded-[1.15rem] border border-[rgba(27,97,118,0.12)] bg-[rgba(27,97,118,0.05)] px-4 py-3 text-sm leading-6 text-[var(--color-texto)]">
          Enlace detectado. Completa el acceso con este mismo correo.
        </div>
      ) : null}

      <button
        className="inline-flex w-full items-center justify-center rounded-[1.15rem] border-0 px-4 py-3.5 text-sm font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-acento)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        type="submit"
        disabled={enviando}
        style={{
          backgroundColor: "var(--color-secundario)",
          boxShadow: "0 16px 34px rgba(87, 125, 138, 0.22)",
        }}
      >
        <Mail className="mr-2 size-4" />
        {enviando ? "Enviando..." : mensaje ? "Reenviar enlace" : "Acceder al sistema"}
        <ArrowRight className="ml-2 size-4" />
      </button>

      {enlacePendiente ? (
        <Boton
          className="w-full rounded-[1.15rem] py-3.5"
          type="button"
          variante="secundaria"
          onClick={completarEnlace}
          disabled={completandoEnlace}
        >
          <ArrowRight className="mr-2 size-4" />
          {completandoEnlace ? "Completando..." : "Completar acceso"}
        </Boton>
      ) : null}

      {mensaje ? (
        <div className="rounded-[1.15rem] border border-[rgba(27,97,118,0.12)] bg-[rgba(27,97,118,0.05)] px-4 py-3 text-sm leading-6 text-[var(--color-acento)]">
          {mensaje}
        </div>
      ) : null}

      {mostrarAvisoBloqueo ? (
        <div className="rounded-[1.15rem] border border-[rgba(181,66,45,0.12)] bg-[rgba(181,66,45,0.06)] px-4 py-3 text-sm leading-6 text-[var(--color-peligro)]">
          {motivoBloqueo}
        </div>
      ) : null}
    </form>
  );
}
