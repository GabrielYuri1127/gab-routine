# Gavium

<p align="center">
  <img src="public/brand/gavium-logo.svg" alt="Gavium" width="420" />
</p>

Aplicativo pessoal e academico mobile-first para organizar rotina, faculdade, faltas, notas, atividades, tarefas, compromissos e lembretes. A base atual entrega persistencia local, calendario mensal, telas editaveis, backup local, login Supabase com dados separados por usuario, PWA Android, notificacoes push preparadas e assistente com comandos automaticos.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Componentes locais inspirados em shadcn/ui
- Lucide Icons
- Zod
- Supabase free para cadastro, login e persistencia em nuvem por usuario
- PWA com manifest, service worker e icone maskable para Android
- Web Push para lembretes no Android quando VAPID, Supabase e agendamento estiverem configurados
- Google Classroom preparado via OAuth somente leitura
- Tutorial interno e perfil personalizavel para uso por outras pessoas
- Suporte por WhatsApp com link direto

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
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Chaves privadas de IA, VAPID e service role ficam somente no servidor.

Para notificacoes push no Android:

```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:seu-email@exemplo.com
CRON_SECRET=
```

Para importar turmas e atividades do Google Classroom:

```bash
GOOGLE_CLASSROOM_CLIENT_ID=
GOOGLE_CLASSROOM_CLIENT_SECRET=
GOOGLE_CLASSROOM_REDIRECT_URI=http://localhost:3000/api/classroom/callback
```

## Supabase

O arquivo `supabase/schema.sql` prepara as tabelas principais, cria `routine_snapshots` para salvar o estado completo do app por pessoa e habilita RLS por `user_id`.

Uso pessoal gratuito recomendado:

- Crie um projeto no plano gratuito do Supabase.
- Rode `supabase/schema.sql` no SQL Editor.
- Ative autenticacao por email e senha.
- Configure as variaveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Cada pessoa deve criar ou entrar com a propria conta em `/login`; assim disciplinas, faltas, notas, tarefas, lembretes e Classroom ficam isolados.

Sem essas variaveis, o app continua funcionando em modo local com `localStorage`, mas nao e o modo ideal para compartilhar com varias pessoas.

Veja `docs/supabase-setup.md` para configurar e testar duas contas sem misturar dados.

## PWA Android

O app ja inclui:

- `public/manifest.webmanifest`
- icone normal e maskable em SVG
- `public/sw.js` com cache basico e estrutura inicial para push
- painel de notificacoes em `/configuracoes`
- inscricao de aparelho com Supabase
- botao de teste de notificacao
- rota segura para disparar lembretes vencidos
- registro do service worker em producao
- shortcuts para falta, nota, tarefa, lembrete e compromisso

No Android, instale pelo Chrome/Edge usando "Adicionar a tela inicial" depois do deploy em HTTPS. O manifesto usa `standalone`, `theme_color`, `background_color`, `id`, `display_override`, shortcuts e icone maskable.

## Notificacoes

As preferencias padrao ficam em `services/notifications/defaults.ts`. A central de lembretes existe dentro do app e o Web Push ja tem:

- `app/api/notifications/subscribe`
- `app/api/notifications/test`
- `app/api/notifications/dispatch`
- `.github/workflows/notifications.yml`

Veja `docs/push-notifications.md` para gerar as chaves VAPID, ativar no Android e configurar o agendamento automatico pelo GitHub Actions.

## IA

A arquitetura inicial fica em:

- `lib/ai/provider.ts`
- `lib/ai/prompts.ts`
- `lib/ai/context-builder.ts`
- `lib/ai/structured-output.ts`
- `lib/ai/command-parser.ts`
- `services/ai/`

Por padrao o provedor esta desativado, entao o app continua funcionando com regras internas. A rota `/assistente` ja responde perguntas sobre prioridades, faltas, medias, prazos e status de publicacao usando os dados locais. Ela tambem entende comandos como registrar faltas, adicionar notas, criar atividades, lembretes, compromissos e tarefas, salvando direto quando os dados estao claros e pedindo complemento quando falta algo essencial. Quando `AI_PROVIDER=openai` e `AI_API_KEY` estiverem configurados no servidor, `/api/assistant` usa IA real sem expor a chave no navegador.

Veja `docs/ai-setup.md` antes de configurar a IA na Vercel.

## Google Classroom

A tela `/configuracoes` tem um painel para conectar o Google Classroom e importar cursos ativos como disciplinas, com trabalhos datados virando atividades. Veja `docs/google-classroom.md` para configurar o OAuth no Google Cloud e na Vercel.

## Publicacao

Veja `docs/vercel-deploy.md` para publicar na Vercel e `docs/checklist-publicacao.md` para conferir o app antes de compartilhar.

## Tutorial E Personalizacao

A rota `/tutorial` mostra o caminho inicial para configurar o app, cadastrar disciplinas, registrar dados antigos e instalar no Android. Em `/configuracoes`, o perfil do app permite trocar nome, pessoa usuaria, cor principal, estilo da IA, semestre padrao, carga horaria e modulos visiveis.

## Portfolio

O material apresentavel fica em `portfolio/`, com case study, ferramentas do projeto, roteiro de apresentacao e roadmap.

## Deploy Gratuito Na Vercel

1. Suba o projeto para um repositorio Git.
2. Importe na Vercel.
3. Configure as variaveis gratuitas quando Supabase/IA/push forem ativados.
4. Use o build padrao: `npm run build`.

## Entregue

- Home Hoje com proximo item, agenda do dia, compromissos, pendencias, lembretes e resumo da faculdade.
- `/assistente` com IA local para perguntas, status do app e comandos automaticos quando os dados estao claros.
- Navegacao mobile com botao central de acao rapida.
- `/faculdade` com busca, filtros por status, cards com atalhos e cadastro detalhado.
- `/faculdade/[id]` com detalhes, acoes rapidas, faltas, notas, simulador, atividades e gerenciamento.
- Faltas em registros individuais com modo rapido/completo, data passada, atalhos de aulas recentes, historico editavel e desfazer.
- Personalizacao de disciplina com professor, sala, semestre, status, observacoes, cor, horarios e regras academicas.
- Acoes de disciplina para pausar, concluir, arquivar, reativar, copiar configuracao e excluir.
- Notas editaveis com nome, valor, maxima, peso, tipo, data, observacao e exclusao.
- Atividades academicas por prazo com busca, filtros, presets, edicao direta e exclusao.
- `/tarefas` com criacao, prioridade, tempo estimado, edicao, conclusao, exclusao e adiamento.
- `/lembretes` com criacao, central, edicao, exclusao e dispensar.
- `/calendario` com aulas, prazos, tarefas, lembretes e compromissos editaveis.
- `/configuracoes` com preferencias de lembrete, exportacao, importacao e restauracao de dados locais.
- `/configuracoes` com status de publicacao separando pendencias atuais e melhorias futuras.
- `/configuracoes` com conexao Google Classroom e importacao para Faculdade.
- `/tutorial` com guia de uso para compartilhar com amigos e familiares.
- Suporte por WhatsApp em `/configuracoes`, `/mais` e `/tutorial`.
- Marca visual propria com icone PWA, icone maskable e logo horizontal em SVG.
- Perfil personalizavel com nome do app, usuario, cor, padroes academicos, modulos e estilo da IA.
- `/login` com Supabase Auth real, cadastro e dados separados por usuario quando configurado.
- Notificacoes push no Android com inscricao de dispositivo, teste manual e dispatch seguro de lembretes.
- Persistencia local via `localStorage`.
- Calculos academicos reutilizaveis em `lib/academic-rules`.
- Preset UFAM em `lib/academic-rules/ufam.ts`.
- PWA base e docs para widget Android futuro.
