import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Control de Fauna Aeroportuario | Grupo Minerquim",
  description: "Plataforma Operacional de Control y Mitigación de Fauna Aeroportuaria",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/logos/Icono Contro Fauna.ico" />
      </head>
      <body>{children}</body>
    </html>
  );
}
