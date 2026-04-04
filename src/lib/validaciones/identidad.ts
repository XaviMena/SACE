import { z } from "zod";

export function normalizar_cedula(valor: string) {
  const soloDigitos = valor.replace(/\D/g, "");
  if (soloDigitos.length === 9) {
    return `0${soloDigitos}`;
  }
  return soloDigitos;
}

export function normalizar_correo(valor: string) {
  return valor.trim().toLowerCase();
}

export function normalizar_telefono_ec(valor: string) {
  return valor.replace(/\D/g, "");
}

export function validar_telefono_ec(valor: string) {
  return /^\d{10}$/.test(normalizar_telefono_ec(valor));
}

export const esquemaDocente = z.object({
  docente_id: z.string().transform(normalizar_cedula).refine((valor) => valor.length === 10, {
    message: "La cédula debe tener 10 dígitos.",
  }),
  cedula: z.string().transform(normalizar_cedula).refine((valor) => valor.length === 10, {
    message: "La cédula debe tener 10 dígitos.",
  }),
  nombres_apellidos: z.string().min(5, "Ingrese nombres y apellidos."),
  correo: z.string().email("Ingrese un correo válido.").transform(normalizar_correo),
  telefono: z.string().transform(normalizar_telefono_ec).refine(validar_telefono_ec, {
    message: "El teléfono debe tener 10 dígitos.",
  }),
  activo: z.boolean(),
  usuario_uid: z.string().nullable(),
  estado_registro: z.enum(["activo", "pendiente_registro", "bloqueado"]),
});

export const esquemaFormularioDocente = z.object({
  cedula: z.string().transform(normalizar_cedula).refine((valor) => valor.length === 10, {
    message: "La cédula debe tener 10 dígitos.",
  }),
  nombres_apellidos: z.string().trim().min(5, "Ingrese nombres y apellidos."),
  correo: z.string().email("Ingrese un correo válido.").transform(normalizar_correo),
  telefono: z.string().transform(normalizar_telefono_ec).refine(validar_telefono_ec, {
    message: "El teléfono debe tener 10 dígitos.",
  }),
  estado_registro: z.enum(["activo", "pendiente_registro", "bloqueado"]),
  activo: z.boolean(),
});

export type ValoresFormularioDocente = z.infer<typeof esquemaFormularioDocente>;
