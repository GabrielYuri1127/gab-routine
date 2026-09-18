import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gavium",
  description: "Sistema pessoal para rotina, estudos, trabalho, tarefas, lembretes e produtividade.",
  applicationName: "Gavium",
  icons: {
    apple: "/icons/apple-touch-icon.png",
    icon: [
      { sizes: "192x192", type: "image/png", url: "/icons/icon-192.png" },
      { sizes: "512x512", type: "image/png", url: "/icons/icon-512.png" }
    ]
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Gavium",
    statusBarStyle: "default"
  }
};

export const viewport: Viewport = {
  themeColor: "#15161a",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AppShell>{children}</AppShell>
        <PwaRegister />
      </body>
    </html>
  );
}
