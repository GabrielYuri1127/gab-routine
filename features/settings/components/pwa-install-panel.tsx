"use client";

import { CheckCircle2, Download, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaInstallPanel() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const updateInstalledState = () => setInstalled(displayMode.matches);
    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setMessage("Gavium instalado neste aparelho.");
    };

    updateInstalledState();
    displayMode.addEventListener("change", updateInstalledState);
    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      displayMode.removeEventListener("change", updateInstalledState);
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setMessage("Instalacao aceita. O Gavium aparecera na tela inicial.");
    } else {
      setMessage("Instalacao cancelada. Voce pode tentar novamente pelo menu do navegador.");
    }
    setInstallPrompt(null);
  }

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Smartphone aria-hidden className="h-5 w-5 text-mint" />
            <h2 className="text-lg font-semibold text-foreground">Aplicativo no Android</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={installed ? "mint" : "sky"}>{installed ? "instalado" : "PWA"}</Badge>
            <Badge tone={installPrompt ? "mint" : "neutral"}>{installPrompt ? "pronto para instalar" : "aguardando navegador"}</Badge>
          </div>
        </div>

        <Button disabled={installed || !installPrompt} onClick={handleInstall}>
          {installed ? <CheckCircle2 aria-hidden className="h-4 w-4" /> : <Download aria-hidden className="h-4 w-4" />}
          {installed ? "Instalado" : "Instalar"}
        </Button>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-600">
        {installed
          ? "O Gavium esta funcionando como aplicativo independente neste aparelho."
          : installPrompt
            ? "O navegador confirmou que este aparelho pode instalar o Gavium."
            : "Abra o Gavium no Chrome do Android; a instalacao aparecera aqui quando estiver disponivel."}
      </p>
      {message ? <p className="mt-2 text-sm font-medium text-mint">{message}</p> : null}
    </section>
  );
}
