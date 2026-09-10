import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gavium",
  description: "Secretario pessoal e academico para rotina, faculdade e lembretes.",
  applicationName: "Gavium",
  icons: {
    apple: "/icons/maskable-icon.svg",
    icon: "/icons/icon.svg"
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
