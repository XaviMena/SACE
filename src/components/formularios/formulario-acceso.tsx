"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/boton";
import { Campo } from "@/components/ui/campo";
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
    <form className="space-y-6" onSubmit={onSubmit}>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--color-borde-suave)] bg-[var(--color-superficie-secundaria)] px-4 py-3 text-xs uppercase tracking-[0.16em] text-[var(--color-texto-suave)]">
        <span>Modo de acceso</span>
        <span className="font-semibold text-[var(--color-acento)]">{modoAcceso}</span>
      </div>

      <Campo
        etiqueta="Correo de acceso"
        id="correo"
        type="email"
        placeholder="nombre@institucion.edu.ec"
        error={errors.correo?.message}
        ayuda="Usaremos enlace mágico para evitar contraseñas iniciales."
        {...register("correo")}
      />

      {enlacePendiente ? (
        <div className="rounded-2xl border border-[rgba(22,93,115,0.12)] bg-[rgba(22,93,115,0.04)] px-4 py-3 text-sm leading-6 text-[var(--color-texto)]">
          Detectamos un enlace mágico abierto en esta pantalla. Si el navegador no conservó el correo original,
          puedes completar el acceso usando el mismo correo escrito arriba.
        </div>
      ) : null}

      <Boton className="w-full" type="submit" disabled={enviando}>
        <Mail className="mr-2 size-4" />
        {enviando ? "Enviando enlace..." : "Enviar enlace mágico"}
      </Boton>

      {enlacePendiente ? (
        <Boton
          className="w-full"
          type="button"
          variante="secundaria"
          onClick={completarEnlace}
          disabled={completandoEnlace}
        >
          {completandoEnlace ? "Completando acceso..." : "Completar acceso con este correo"}
        </Boton>
      ) : null}

      {mensaje ? (
        <div className="rounded-2xl border border-[rgba(22,93,115,0.12)] bg-[rgba(22,93,115,0.06)] px-4 py-3 text-sm text-[var(--color-acento)]">
          {mensaje}
        </div>
      ) : null}

      {motivoBloqueo && modoAcceso === "firebase" ? (
        <div className="rounded-2xl border border-[rgba(181,66,45,0.12)] bg-[rgba(181,66,45,0.06)] px-4 py-3 text-sm text-[var(--color-peligro)]">
          {motivoBloqueo}
        </div>
      ) : null}
    </form>
  );
}
