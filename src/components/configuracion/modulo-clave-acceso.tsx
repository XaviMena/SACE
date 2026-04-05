"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KeyRound, LockKeyhole } from "lucide-react";
import { EncabezadoPagina } from "@/components/layout/encabezado-pagina";
import { Boton } from "@/components/ui/boton";
import { Campo } from "@/components/ui/campo";
import { useSesion } from "@/lib/auth/proveedor-sesion";

const esquemaCambioClave = z
  .object({
    clave_actual: z.string().min(1, "Ingresa tu clave anterior."),
    clave_nueva: z.string().min(6, "La nueva clave debe tener al menos 6 caracteres."),
    clave_confirmacion: z.string().min(1, "Confirma la nueva clave."),
  })
  .refine((valores) => valores.clave_nueva === valores.clave_confirmacion, {
    path: ["clave_confirmacion"],
    message: "La confirmación de la nueva clave no coincide.",
  });

type ValoresCambioClave = z.infer<typeof esquemaCambioClave>;

export function ModuloClaveAcceso() {
  const { usuario } = useSesion();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [estaPendiente, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ValoresCambioClave>({
    resolver: zodResolver(esquemaCambioClave),
    defaultValues: {
      clave_actual: "",
      clave_nueva: "",
      clave_confirmacion: "",
    },
  });

  const onSubmit = handleSubmit((valores) => {
    setMensaje(null);
    setMensajeError(null);

    startTransition(async () => {
      try {
        if (!usuario) {
          throw new Error("No se encontró una sesión válida.");
        }

        const respuesta = await fetch("/api/auth/clave", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uid: usuario.uid,
            clave_actual: valores.clave_actual,
            clave_nueva: valores.clave_nueva,
            clave_confirmacion: valores.clave_confirmacion,
          }),
        });

        const datos = (await respuesta.json()) as { ok?: boolean; mensaje?: string };

        if (!respuesta.ok || datos.ok === false) {
          throw new Error(datos.mensaje ?? "No se pudo actualizar la clave de acceso.");
        }

        setMensaje(datos.mensaje ?? "Tu clave de acceso fue actualizada correctamente.");
        reset();
      } catch (error) {
        setMensajeError(error instanceof Error ? error.message : "No se pudo actualizar la clave de acceso.");
      }
    });
  });

  return (
    <div className="space-y-8">
      <EncabezadoPagina
        titulo="Cambiar clave de acceso"
        descripcion="Actualiza tu clave para ingresar al sistema con mayor seguridad."
      />

      <section className="max-w-2xl space-y-5">
        <div className="rounded-[1.5rem] border border-[var(--color-borde-suave)] bg-[var(--color-superficie-secundaria)] p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-[rgba(27,97,118,0.1)] p-2 text-[var(--color-acento)]">
              <LockKeyhole className="size-4" />
            </div>
            <div className="space-y-1">
              <p className="text-[var(--tamano-ui)] font-semibold text-[var(--color-texto)]">Clave personal</p>
              <p className="text-[var(--tamano-ui)] texto-suave">
                Usa una clave nueva de al menos 6 caracteres. Después de guardarla, será la única válida para tu ingreso.
              </p>
            </div>
          </div>
        </div>

        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="grid gap-4">
            <Campo
              etiqueta="Clave anterior"
              id="clave_actual"
              type="password"
              autoComplete="current-password"
              error={errors.clave_actual?.message}
              {...register("clave_actual")}
            />
            <Campo
              etiqueta="Nueva clave"
              id="clave_nueva"
              type="password"
              autoComplete="new-password"
              ayuda="Debe tener al menos 6 caracteres."
              error={errors.clave_nueva?.message}
              {...register("clave_nueva")}
            />
            <Campo
              etiqueta="Confirmar nueva clave"
              id="clave_confirmacion"
              type="password"
              autoComplete="new-password"
              error={errors.clave_confirmacion?.message}
              {...register("clave_confirmacion")}
            />
          </div>

          {mensaje ? (
            <div className="rounded-2xl border border-[rgba(31,122,79,0.16)] bg-[rgba(31,122,79,0.08)] px-4 py-3 text-[var(--tamano-ui)] text-[var(--color-exito)]">
              {mensaje}
            </div>
          ) : null}

          {mensajeError ? (
            <div className="rounded-2xl border border-[rgba(181,66,45,0.14)] bg-[rgba(181,66,45,0.07)] px-4 py-3 text-[var(--tamano-ui)] text-[var(--color-peligro)]">
              {mensajeError}
            </div>
          ) : null}

          <Boton type="submit" disabled={estaPendiente}>
            <KeyRound className="mr-2 size-4" />
            {estaPendiente ? "Guardando..." : "Guardar nueva clave"}
          </Boton>
        </form>
      </section>
    </div>
  );
}
