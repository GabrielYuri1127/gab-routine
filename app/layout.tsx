import type { Metadata, Viewport } from "next";
import Script from "next/script";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { PwaRegister } from "@/components/pwa-register";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const themeScript = `
  (function () {
    try {
      var mode = localStorage.getItem("gavium-theme") || "system";
      var dark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
      document.documentElement.style.colorScheme = dark ? "dark" : "light";
    } catch (_) {}
  })();
`;

export const metadata: Metadata = {
  title: "Gavium",
  description: "Planejamento integrado para faculdade e trabalho, com disciplinas, faltas, progresso e prioridades.",
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
  themeColor: "#f5f7fb",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <Script id="gavium-theme" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
          <PwaRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
