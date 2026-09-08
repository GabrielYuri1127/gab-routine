# Gab routine

Aplicativo pessoal e academico mobile-first para organizar rotina, faculdade, faltas, notas e atividades. A Fase 1 entrega uma base Next.js funcional com PWA, modulo Faculdade e regras academicas UFAM centralizadas.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Componentes locais inspirados em shadcn/ui, sem adicionar biblioteca pesada nesta fase
- Lucide Icons
- Zod
- Supabase preparado para Fase 2
- PWA com manifest e service worker base

## Como rodar

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

## Variaveis de ambiente

Copie `.env.example` para `.env.local` quando for ativar Supabase, IA ou push:

```bash
cp .env.example .env.local
```

Nenhuma chave deve ir para o frontend sem o prefixo correto. Chaves privadas de IA, VAPID e service role ficam somente no servidor.

## Supabase

Supabase entra na Fase 2 para autenticacao e persistencia. O arquivo `supabase/schema.sql` ja prepara as tabelas principais e habilita RLS por `user_id`.

Opcao recomendada para uso pessoal gratuito:

- Autenticacao por email e senha.
- Plano gratuito do Supabase.
- RLS obrigatorio em todas as tabelas pessoais.

## PWA

A Fase 1 inclui:

- `public/manifest.webmanifest`
- icone normal e maskable em SVG
- `public/sw.js` com cache basico e estrutura inicial para push
- registro do service worker em producao
- shortcuts para falta, nota, tarefa e lembrete

No Android, instale pelo Chrome/Edge usando "Adicionar a tela inicial" depois do deploy em HTTPS. O manifesto ja usa `standalone`, `theme_color`, `background_color`, `id`, `display_override`, shortcuts e icone maskable.

## Notificacoes

As preferencias e offsets padrao estao em `services/notifications/defaults.ts`. Push completo, VAPID, subscriptions e central de notificacoes entram na Fase 3.

## IA

A arquitetura inicial fica em:

- `lib/ai/provider.ts`
- `lib/ai/prompts.ts`
- `lib/ai/context-builder.ts`
- `lib/ai/structured-output.ts`
- `services/ai/`

Por padrao o provedor esta desativado, entao o app continua funcionando com regras internas. A IA nunca deve registrar falta, alterar nota, excluir dados ou aplicar planejamento sem confirmacao.

## Deploy gratuito na Vercel

1. Suba o projeto para um repositorio Git.
2. Importe na Vercel.
3. Configure as variaveis de ambiente gratuitas quando Supabase/IA/push forem ativados.
4. Use o build padrao: `npm run build`.

## Fase 1 entregue

- Home Hoje com proximo item, agenda do dia, pendencias e resumo da faculdade.
- Navegacao mobile com botao central de acao rapida.
- `/faculdade` com disciplinas e cadastro rapido.
- `/faculdade/[id]` com detalhes, faltas, notas, simulador e atividades.
- Faltas em registros individuais com modo simples/completo, historico editavel e desfazer.
- Calculos academicos reutilizaveis em `lib/academic-rules`.
- Preset UFAM em `lib/academic-rules/ufam.ts`.
- PWA base e docs para widget Android futuro.
