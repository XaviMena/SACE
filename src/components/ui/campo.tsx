import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

interface CampoProps extends InputHTMLAttributes<HTMLInputElement> {
  etiqueta: string;
  ayuda?: string;
  error?: string;
}

export function Campo({ etiqueta, ayuda, error, className, id, ...props }: CampoProps) {
  return (
    <label className="flex flex-col gap-1.5 text-[var(--tamano-ui)] text-[var(--color-texto)]" htmlFor={id}>
      <span className="font-semibold">{etiqueta}</span>
      <input
        id={id}
        className={cn(
          "rounded-[0.5rem] border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-2.5 text-[var(--tamano-ui)] outline-none transition placeholder:text-[var(--color-texto-suave)] focus:border-[var(--color-acento)] focus:ring-3 focus:ring-[rgba(22,93,115,0.15)]",
          className,
        )}
        {...props}
      />
      {error ? (
        <span className="text-[var(--tamano-ui)] text-[var(--color-peligro)]">{error}</span>
      ) : ayuda ? (
        <span className="text-[var(--tamano-ui)] texto-suave">{ayuda}</span>
      ) : null}
    </label>
  );
}
