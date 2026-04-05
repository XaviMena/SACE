import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ProveedorSesion } from "@/lib/auth/proveedor-sesion";

const fuenteInter = Inter({
  variable: "--font-texto",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SACE",
  description: "Sistema Automatizado de Gestión Escolar",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${fuenteInter.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[var(--color-fondo)] text-[var(--color-texto)]">
        <ProveedorSesion>{children}</ProveedorSesion>
      </body>
    </html>
  );
}
