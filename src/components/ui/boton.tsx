import type { ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const estilosBoton = cva(
  "inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-acento)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variante: {
        primaria:
          "bg-[var(--color-acento)] text-white shadow-[0_14px_30px_rgba(10,158,189,0.18)] hover:bg-[var(--color-acento-fuerte)]",
        secundaria:
          "border border-[var(--color-borde)] bg-[var(--color-superficie)] text-[var(--color-texto)] hover:bg-[var(--color-superficie-secundaria)]",
        fantasma: "text-[var(--color-acento)] hover:bg-[var(--color-superficie-secundaria)]",
      },
    },
    defaultVariants: {
      variante: "primaria",
    },
  },
);

type BotonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof estilosBoton>;

export function Boton({ className, variante, ...props }: BotonProps) {
  return <button className={cn(estilosBoton({ variante }), className)} {...props} />;
}
