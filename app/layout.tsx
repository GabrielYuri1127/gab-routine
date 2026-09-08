import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gab routine",
  description: "Secretario pessoal e academico para rotina, faculdade e lembretes.",
  applicationName: "Gab routine",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Gab routine",
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
