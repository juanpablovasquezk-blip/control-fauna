import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Control de Fauna Aeroportuario | Grupo Minerquim",
  description: "Plataforma Operacional de Control y Mitigación de Fauna Aeroportuaria",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Control Fauna",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#ea580c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
