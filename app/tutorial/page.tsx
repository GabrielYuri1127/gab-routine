import Link from "next/link";
import {
  Bell,
  BookOpen,
  Bot,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  GraduationCap,
  Settings,
  Smartphone
} from "lucide-react";

import { Badge } from "@/components/ui/badge";

const firstSteps = [
  {
    title: "Ajuste seu perfil",
    text: "Troque o nome do app, seu nome, cor principal, semestre padrao e modulos que aparecem no menu.",
    href: "/configuracoes",
    label: "Configurar"
  },
  {
    title: "Cadastre as disciplinas",
    text: "Coloque professor, sala, horarios, carga horaria e regras de falta. Depois cada materia pode ser editada por completo.",
    href: "/faculdade",
    label: "Abrir Faculdade"
  },
  {
    title: "Registre o que ja aconteceu",
    text: "Adicione faltas, notas e atividades antigas para o painel calcular frequencia, media e prazos sem comecar do zero.",
    href: "/faculdade",
    label: "Atualizar dados"
  },
  {
    title: "Use a tela Hoje",
    text: "Depois dos cadastros, a tela inicial vira seu resumo diario com aulas, tarefas, compromissos, lembretes e prazos.",
    href: "/",
    label: "Ver Hoje"
  }
];

const areas = [
  {
    icon: GraduationCap,
    title: "Faculdade",
    text: "Controle disciplinas, faltas, notas, atividades, horarios e status de cada materia.",
    href: "/faculdade"
  },
  {
    icon: CheckSquare,
    title: "Tarefas",
    text: "Organize pendencias por data, prioridade e tempo estimado. Marque como concluida quando finalizar.",
    href: "/tarefas"
  },
  {
    icon: Bell,
    title: "Lembretes",
    text: "Guarde avisos rapidos para nao depender apenas da memoria ou de mensagens espalhadas.",
    href: "/lembretes"
  },
  {
    icon: CalendarDays,
    title: "Calendario",
    text: "Veja aulas, prazos, tarefas, lembretes e compromissos juntos no mes.",
    href: "/calendario"
  },
  {
    icon: Bot,
    title: "Assistente",
    text: "Pergunte o que fazer agora, quais prazos venceram, como estao as faltas ou quais notas pedem atencao.",
    href: "/assistente"
  },
  {
    icon: Settings,
    title: "Configuracoes",
    text: "Exporte backup, importe dados, personalize o app e conecte servicos como Google Classroom.",
    href: "/configuracoes"
  }
];

const sharingChecklist = [
  "Antes de compartilhar, abra Configuracoes e use Restaurar perfil padrao se quiser mandar limpo.",
  "Cada pessoa deve usar o proprio navegador ou login para os dados nao se misturarem.",
  "No Android, abra a URL publicada no Chrome e use Adicionar a tela inicial.",
  "Para trocar de aparelho, exporte o backup em Configuracoes e importe no outro navegador."
];

export default function TutorialPage() {
  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-medium text-mint">Tutorial</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink sm:text-3xl">Comece sem bagunca</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Um roteiro curto para deixar o app pronto para rotina, faculdade e uso no celular.
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-2">
        {firstSteps.map((step, index) => (
          <div className="rounded-lg border border-line bg-white p-4 shadow-sm" key={step.title}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <Badge tone="mint">Passo {index + 1}</Badge>
              <CheckCircle2 aria-hidden className="h-4 w-4 text-mint" />
            </div>
            <h2 className="text-base font-semibold text-ink">{step.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
            <Link
              className="mt-4 inline-flex h-10 items-center justify-center rounded-lg border border-line px-3 text-sm font-medium text-ink transition hover:bg-slate-50"
              href={step.href}
            >
              {step.label}
            </Link>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <BookOpen aria-hidden className="h-5 w-5 text-gold" />
          <h2 className="text-lg font-semibold text-ink">Onde fica cada coisa</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {areas.map((area) => {
            const Icon = area.icon;

            return (
              <Link className="rounded-lg border border-line p-3 transition hover:bg-slate-50" href={area.href} key={area.href}>
                <Icon aria-hidden className="h-5 w-5 text-mint" />
                <h3 className="mt-3 text-sm font-semibold text-ink">{area.title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{area.text}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-line bg-ink p-4 text-white shadow-soft">
        <div className="mb-4 flex items-center gap-2">
          <Smartphone aria-hidden className="h-5 w-5 text-white/75" />
          <h2 className="text-lg font-semibold">Para compartilhar</h2>
        </div>
        <div className="space-y-3">
          {sharingChecklist.map((item) => (
            <div className="flex items-start gap-3 text-sm leading-6 text-white/85" key={item}>
              <CheckCircle2 aria-hidden className="mt-1 h-4 w-4 shrink-0 text-white/70" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
