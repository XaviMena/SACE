"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AtSign, Eye, EyeOff, KeyRound, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/boton";
import { iniciar_sesion_con_credenciales } from "@/lib/auth/acciones";
import { normalizar_cedula } from "@/lib/validaciones/identidad";
import { useSesion } from "@/lib/auth/proveedor-sesion";

const esquemaAcceso = z.object({
  correo: z.string().trim().toLowerCase().email("Ingresa un correo válido."),
  contrasena: z.string().min(1, "Ingresa la contraseña."),
});

const esquemaSolicitudDocente = z.object({
  cedula: z.string().transform(normalizar_cedula).refine((valor) => valor.length === 10, {
    message: "La cédula debe tener 10 dígitos.",
  }),
  correo_solicitud: z.string().trim().toLowerCase().email("Ingresa un correo válido."),
});

type ValoresAcceso = z.infer<typeof esquemaAcceso>;
type ValoresSolicitudDocente = z.infer<typeof esquemaSolicitudDocente>;

export function FormularioAcceso() {
  const router = useRouter();
  const { cargando, puedeAccederPanel, motivoBloqueo } = useSesion();
  const [hidratado, setHidratado] = useState(false);
  const [vista, setVista] = useState<"acceso" | "solicitud">("acceso");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [mensajeSolicitud, setMensajeSolicitud] = useState<string | null>(null);
  const [iniciandoCredenciales, setIniciandoCredenciales] = useState(false);
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);
  const [validandoAcceso, setValidandoAcceso] = useState(false);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);

  const formularioAcceso = useForm<ValoresAcceso>({
    resolver: zodResolver(esquemaAcceso),
    defaultValues: {
      correo: "",
      contrasena: "",
    },
  });

  const formularioSolicitud = useForm<ValoresSolicitudDocente>({
    resolver: zodResolver(esquemaSolicitudDocente),
    defaultValues: {
      cedula: "",
      correo_solicitud: "",
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = formularioAcceso;

  const {
    register: registerSolicitud,
    handleSubmit: handleSubmitSolicitud,
    reset: resetSolicitud,
    formState: { errors: erroresSolicitud },
  } = formularioSolicitud;

  useEffect(() => {
    setHidratado(true);
  }, []);

  useEffect(() => {
    if (puedeAccederPanel) {
      router.replace("/dashboard");
    }
  }, [puedeAccederPanel, router]);

  const onSubmitCredenciales = handleSubmit(async ({ correo, contrasena }) => {
    setIniciandoCredenciales(true);
    setMensaje(null);
    setValidandoAcceso(true);

    try {
      const resultado = await iniciar_sesion_con_credenciales(correo, contrasena);

      if (!resultado.ok) {
        setValidandoAcceso(false);
        setMensaje(resultado.mensaje);
        return;
      }

      setMensaje(resultado.mensaje);
      window.setTimeout(() => {
        window.location.assign("/dashboard");
      }, 150);
    } finally {
      setIniciandoCredenciales(false);
    }
  });

  const onSubmitSolicitud = handleSubmitSolicitud(async ({ cedula, correo_solicitud }) => {
    setEnviandoSolicitud(true);
    setMensajeSolicitud(null);

    try {
      const respuesta = await fetch("/api/acceso/solicitud-docente", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cedula,
          correo: correo_solicitud,
        }),
      });

      const datos = (await respuesta.json()) as { ok?: boolean; mensaje?: string };
      setMensajeSolicitud(datos.mensaje ?? "No se pudo registrar la solicitud.");

      if (respuesta.ok && datos.ok !== false) {
        resetSolicitud();
      }
    } finally {
      setEnviandoSolicitud(false);
    }
  });

  useEffect(() => {
    if (puedeAccederPanel) {
      setValidandoAcceso(false);
    }
  }, [puedeAccederPanel]);

  useEffect(() => {
    if (cargando || !validandoAcceso) {
      return;
    }

    if (motivoBloqueo) {
      setMensaje(motivoBloqueo);
      setValidandoAcceso(false);
    }
  }, [cargando, validandoAcceso, motivoBloqueo]);

  const vistaActiva = hidratado ? vista : "acceso";

  return (
    <div className="space-y-5">
      {vistaActiva === "acceso" ? (
        <form className="space-y-5" onSubmit={onSubmitCredenciales}>
          <div className="space-y-2">
            <p className="text-[var(--tamano-ui)] font-medium text-[var(--color-texto)]">Acceso</p>
            <p className="text-[var(--tamano-ui)] texto-suave">Ingresa con tu correo y tu clave.</p>
          </div>

          <div className="space-y-2.5">
            <label className="block text-[var(--tamano-ui)] font-medium text-[var(--color-neutral)]" htmlFor="correo">
              Correo
            </label>
            <div className="relative">
              <AtSign className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-[var(--color-neutral)]" />
              <input
                id="correo"
                type="email"
                placeholder="nombre@institucion.edu.ec"
                className="w-full rounded-[1.15rem] border border-[rgba(215,222,227,0.95)] bg-white py-4 pr-4 pl-12 text-[var(--tamano-ui)] text-[var(--color-texto)] shadow-[0_8px_24px_rgba(20,34,46,0.04)] outline-none transition placeholder:text-[rgba(99,114,129,0.58)] focus:border-[var(--color-acento)] focus:ring-3 focus:ring-[rgba(10,158,189,0.12)]"
                {...register("correo")}
              />
            </div>
            {errors.correo?.message ? (
              <p className="text-[var(--tamano-ui)] text-[var(--color-peligro)]">{errors.correo.message}</p>
            ) : null}
          </div>

          <div className="space-y-2.5">
            <label className="block text-[var(--tamano-ui)] font-medium text-[var(--color-neutral)]" htmlFor="contrasena">
              Contraseña
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-[var(--color-neutral)]" />
              <input
                id="contrasena"
                type={mostrarContrasena ? "text" : "password"}
                placeholder="Ingresa tu contraseña"
                className="w-full rounded-[1.15rem] border border-[rgba(215,222,227,0.95)] bg-white py-4 pr-24 pl-12 text-[var(--tamano-ui)] text-[var(--color-texto)] shadow-[0_8px_24px_rgba(20,34,46,0.04)] outline-none transition placeholder:text-[rgba(99,114,129,0.58)] focus:border-[var(--color-acento)] focus:ring-3 focus:ring-[rgba(10,158,189,0.12)]"
                {...register("contrasena")}
              />
              <button
                className="absolute top-1/2 right-3 inline-flex -translate-y-1/2 items-center gap-1 rounded-full px-2.5 py-1 text-[var(--tamano-ui)] font-medium text-[var(--color-acento)] transition hover:bg-[rgba(10,158,189,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-acento)]"
                type="button"
                onClick={() => setMostrarContrasena((actual) => !actual)}
                aria-label={mostrarContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {mostrarContrasena ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                {mostrarContrasena ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            {errors.contrasena?.message ? (
              <p className="text-[var(--tamano-ui)] text-[var(--color-peligro)]">{errors.contrasena.message}</p>
            ) : null}
          </div>

          <Boton className="w-full rounded-[1.15rem] py-3.5" type="submit" disabled={iniciandoCredenciales || validandoAcceso}>
            <KeyRound className="mr-2 size-4" />
            {iniciandoCredenciales || validandoAcceso ? "Ingresando..." : "Iniciar sesión"}
          </Boton>

          {mensaje ? (
            <div className="rounded-[1.15rem] border border-[rgba(27,97,118,0.12)] bg-[rgba(27,97,118,0.05)] px-4 py-3 text-[var(--tamano-ui)] leading-[1.5] text-[var(--color-acento)]">
              {mensaje}
            </div>
          ) : null}

          <button
            type="button"
            className="inline-flex items-center gap-2 text-[var(--tamano-ui)] font-medium text-[var(--color-acento)] transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-acento)]"
            onClick={() => setVista("solicitud")}
          >
            <UserCheck className="size-4" />
            Solicitar autorización docente
          </button>
        </form>
      ) : (
        <form className="space-y-5" onSubmit={onSubmitSolicitud}>
          <div className="space-y-2">
            <p className="text-[var(--tamano-ui)] font-medium text-[var(--color-texto)]">Solicitud docente</p>
            <p className="text-[var(--tamano-ui)] texto-suave">
              Si eres docente y aún no tienes acceso, completa tus datos para solicitar autorización.
            </p>
          </div>

          <div className="space-y-2.5">
            <label className="block text-[var(--tamano-ui)] font-medium text-[var(--color-neutral)]" htmlFor="cedula">
              Cédula
            </label>
            <div className="relative">
              <UserCheck className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-[var(--color-neutral)]" />
              <input
                id="cedula"
                type="text"
                placeholder="Ingresa tu número de cédula"
                className="w-full rounded-[1.15rem] border border-[rgba(215,222,227,0.95)] bg-white py-4 pr-4 pl-12 text-[var(--tamano-ui)] text-[var(--color-texto)] shadow-[0_8px_24px_rgba(20,34,46,0.04)] outline-none transition placeholder:text-[rgba(99,114,129,0.58)] focus:border-[var(--color-acento)] focus:ring-3 focus:ring-[rgba(10,158,189,0.12)]"
                {...registerSolicitud("cedula")}
              />
            </div>
            {erroresSolicitud.cedula?.message ? (
              <p className="text-[var(--tamano-ui)] text-[var(--color-peligro)]">{erroresSolicitud.cedula.message}</p>
            ) : null}
          </div>

          <div className="space-y-2.5">
            <label className="block text-[var(--tamano-ui)] font-medium text-[var(--color-neutral)]" htmlFor="correo_solicitud">
              Correo institucional
            </label>
            <div className="relative">
              <AtSign className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-[var(--color-neutral)]" />
              <input
                id="correo_solicitud"
                type="email"
                placeholder="nombre@institucion.edu.ec"
                className="w-full rounded-[1.15rem] border border-[rgba(215,222,227,0.95)] bg-white py-4 pr-4 pl-12 text-[var(--tamano-ui)] text-[var(--color-texto)] shadow-[0_8px_24px_rgba(20,34,46,0.04)] outline-none transition placeholder:text-[rgba(99,114,129,0.58)] focus:border-[var(--color-acento)] focus:ring-3 focus:ring-[rgba(10,158,189,0.12)]"
                {...registerSolicitud("correo_solicitud")}
              />
            </div>
            {erroresSolicitud.correo_solicitud?.message ? (
              <p className="text-[var(--tamano-ui)] text-[var(--color-peligro)]">{erroresSolicitud.correo_solicitud.message}</p>
            ) : null}
          </div>

          <Boton className="w-full rounded-[1.15rem] py-3.5" type="submit" disabled={enviandoSolicitud}>
            <UserCheck className="mr-2 size-4" />
            {enviandoSolicitud ? "Enviando solicitud..." : "Solicitar autorización"}
          </Boton>

          {mensajeSolicitud ? (
            <div className="rounded-[1.15rem] border border-[rgba(27,97,118,0.12)] bg-[rgba(27,97,118,0.05)] px-4 py-3 text-[var(--tamano-ui)] leading-[1.5] text-[var(--color-acento)]">
              {mensajeSolicitud}
            </div>
          ) : null}

          <button
            type="button"
            className="inline-flex items-center gap-2 text-[var(--tamano-ui)] font-medium text-[var(--color-acento)] transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-acento)]"
            onClick={() => setVista("acceso")}
          >
            <KeyRound className="size-4" />
            Volver al ingreso
          </button>
        </form>
      )}
    </div>
  );
}
