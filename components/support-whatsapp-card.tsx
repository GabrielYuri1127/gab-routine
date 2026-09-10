import { MessageCircle } from "lucide-react";

const supportPhoneDisplay = "(92) 98843-3769";
const supportWhatsappUrl = "https://wa.me/5592988433769?text=Oi%2C%20preciso%20de%20ajuda%20com%20o%20Gavium.";

export function SupportWhatsAppCard({ compact = false }: { compact?: boolean }) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <MessageCircle aria-hidden className="h-5 w-5 text-mint" />
            <h2 className={compact ? "text-base font-semibold text-ink" : "text-lg font-semibold text-ink"}>Suporte pelo WhatsApp</h2>
          </div>
          <p className="text-sm leading-6 text-slate-600">
            Fale direto com o suporte do Gavium pelo numero {supportPhoneDisplay}.
          </p>
        </div>
        <a
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-medium text-white transition hover:bg-black"
          href={supportWhatsappUrl}
          rel="noreferrer"
          target="_blank"
        >
          <MessageCircle aria-hidden className="h-4 w-4" />
          Chamar suporte
        </a>
      </div>
    </section>
  );
}
