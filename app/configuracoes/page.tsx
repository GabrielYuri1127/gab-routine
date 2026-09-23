import Link from "next/link";

import { SupportWhatsAppCard } from "@/components/support-whatsapp-card";
import { ClassroomImportPanel } from "@/features/classroom/components/classroom-import-panel";
import { AppPreferencesPanel } from "@/features/settings/components/app-preferences-panel";
import { DataTools } from "@/features/settings/components/data-tools";
import { PushNotificationsPanel } from "@/features/settings/components/push-notifications-panel";
import { PwaInstallPanel } from "@/features/settings/components/pwa-install-panel";
import { ThemeSettingsPanel } from "@/features/settings/components/theme-settings-panel";

export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-medium text-mint">Configuracoes</p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">Personalize o Gavium</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Ajuste o visual, as notificacoes, suas contas e a forma como o app organiza sua rotina.
        </p>
      </header>

      <ThemeSettingsPanel />
      <PushNotificationsPanel />
      <AppPreferencesPanel />
      <PwaInstallPanel />
      <DataTools />
      <ClassroomImportPanel />
      <SupportWhatsAppCard />

      <Link className="flex h-11 w-full items-center justify-center rounded-lg border border-line bg-white text-sm font-medium text-foreground" href="/mais">
        Voltar para Mais
      </Link>
    </div>
  );
}
