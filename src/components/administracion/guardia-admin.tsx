"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSesion } from "@/lib/auth/proveedor-sesion";

export function GuardiaAdmin({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { usuario, cargando, puedeAccederPanel } = useSesion();
  const esAdmin = usuario?.rol === "admin";

  useEffect(() => {
    if (!cargando && (!puedeAccederPanel || !esAdmin)) {
      router.replace("/login");
    }
  }, [cargando, esAdmin, puedeAccederPanel, router]);

  if (cargando || !puedeAccederPanel || !esAdmin) {
    return null;
  }

  return <>{children}</>;
}
