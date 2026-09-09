# Gab routine

Aplicativo pessoal e academico mobile-first para organizar rotina, faculdade, faltas, notas, atividades, tarefas, compromissos e lembretes. A base atual entrega Fase 1 completa e Fase 2 com persistencia local, calendario mensal, telas editaveis, backup local e login Supabase preparado.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Componentes locais inspirados em shadcn/ui
- Lucide Icons
- Zod
- Supabase free preparado para autenticacao e persistencia em nuvem
- PWA com manifest, service worker e icone maskable para Android

## Como Rodar

```bash
npm install
npm run dev
```

Depois abra `http://localhost:3000`.

## Verificacao

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Variaveis De Ambiente

Copie `.env.example` para `.env.local` quando for ativar Supabase, IA ou push:

```bash
cp .env.example .env.local
```

Para login Supabase no app:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Chaves privadas de IA, VAPID e service role ficam somente no servidor.

## Supabase

O arquivo `supabase/schema.sql` prepara as tabelas principais e habilita RLS por `user_id`.

Uso pessoal gratuito recomendado:

- Crie um projeto no plano gratuito do Supabase.
- Rode `supabase/schema.sql` no SQL Editor.
- Ative autenticacao por email e senha.
- Configure as variaveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Sem essas variaveis, o app continua funcionando em modo local com `localStorage`.

## PWA Android

O app ja inclui:

- `public/manifest.webmanifest`
- icone normal e maskable em SVG
- `public/sw.js` com cache basico e estrutura inicial para push
- registro do service worker em producao
- shortcuts para falta, nota, tarefa, lembrete e compromisso

No Android, instale pelo Chrome/Edge usando "Adicionar a tela inicial" depois do deploy em HTTPS. O manifesto usa `standalone`, `theme_color`, `background_color`, `id`, `display_override`, shortcuts e icone maskable.

## Notificacoes

As preferencias padrao ficam em `services/notifications/defaults.ts`. A central de lembretes ja existe dentro do app; push completo com VAPID e subscriptions entra na Fase 3.

## IA

A arquitetura inicial fica em:

- `lib/ai/provider.ts`
- `lib/ai/prompts.ts`
- `lib/ai/context-builder.ts`
- `lib/ai/structured-output.ts`
- `services/ai/`

Por padrao o provedor esta desativado, entao o app continua funcionando com regras internas. A rota `/assistente` ja responde perguntas sobre prioridades, faltas, medias e prazos usando os dados locais. Quando `AI_PROVIDER=openai` e `AI_API_KEY` estiverem configurados no servidor, `/api/assistant` usa IA real sem expor a chave no navegador. A IA nunca deve registrar falta, alterar nota, excluir dados ou aplicar planejamento sem confirmacao.

Veja `docs/ai-setup.md` antes de configurar a IA na Vercel.

## Deploy Gratuito Na Vercel

1. Suba o projeto para um repositorio Git.
2. Importe na Vercel.
3. Configure as variaveis gratuitas quando Supabase/IA/push forem ativados.
4. Use o build padrao: `npm run build`.

## Entregue

- Home Hoje com proximo item, agenda do dia, compromissos, pendencias, lembretes e resumo da faculdade.
- `/assistente` com IA local para perguntas sobre o que fazer agora, faltas, notas e prazos.
- Navegacao mobile com botao central de acao rapida.
- `/faculdade` com disciplinas e cadastro rapido.
- `/faculdade/[id]` com detalhes, faltas, notas, simulador e atividades.
- Faltas em registros individuais com modo rapido/completo, data passada, atalhos de aulas recentes, historico editavel e desfazer.
- Personalizacao de disciplina com professor, sala, semestre, cor, horarios e regras academicas.
- Notas, media, PF necessaria e simulador.
- Atividades academicas por prazo com busca, filtros, presets, edicao direta e exclusao.
- `/tarefas` com criacao, prioridade, tempo estimado, edicao, conclusao, exclusao e adiamento.
- `/lembretes` com criacao, central, edicao, exclusao e dispensar.
- `/calendario` com aulas, prazos, tarefas, lembretes e compromissos editaveis.
- `/configuracoes` com preferencias de lembrete, exportacao, importacao e restauracao de dados locais.
- `/login` com Supabase Auth real quando configurado.
- Persistencia local via `localStorage`.
- Calculos academicos reutilizaveis em `lib/academic-rules`.
- Preset UFAM em `lib/academic-rules/ufam.ts`.
- PWA base e docs para widget Android futuro.
