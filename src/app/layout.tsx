import type { Metadata } from "next";
import { Newsreader, Public_Sans } from "next/font/google";
import "./globals.css";
import { ProveedorSesion } from "@/lib/auth/proveedor-sesion";

const fuenteTitulos = Newsreader({
  variable: "--font-titulos",
  subsets: ["latin"],
});

const fuenteTexto = Public_Sans({
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
      className={`${fuenteTitulos.variable} ${fuenteTexto.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[var(--color-fondo)] text-[var(--color-texto)]">
        <ProveedorSesion>{children}</ProveedorSesion>
      </body>
    </html>
  );
}
