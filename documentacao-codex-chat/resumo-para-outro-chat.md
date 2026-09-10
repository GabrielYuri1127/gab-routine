# Resumo Para Outro Chat

Use este texto quando precisar continuar o projeto em outra conversa.

## Projeto

O projeto agora se chama Gavium. O nome anterior, Gab Routine, era apenas provisoriamente usado durante o inicio do desenvolvimento. E um aplicativo pessoal e academico mobile-first para organizar rotina, faculdade, faltas, notas, atividades, tarefas, compromissos, lembretes e importacao do Google Classroom.

## Estado Atual

- Repositorio: `https://github.com/GabrielYuri1127/gab-routine.git`
- Stack: Next.js App Router, React, TypeScript, Tailwind CSS, Zod, Lucide Icons.
- Deploy planejado: Vercel.
- Mobile: PWA instalavel no Android.
- Persistencia atual: `localStorage`.
- Persistencia futura preparada: Supabase.
- IA: assistente local por regras e rota de servidor pronta para usar OpenAI API com variaveis de ambiente.
- Google Classroom: OAuth preparado, importacao de cursos ativos e trabalhos com data, com suporte a mais de uma conta institucional.

## Funcionalidades Implementadas

- Tela Hoje.
- Faculdade com disciplinas, faltas, notas, atividades e personalizacao.
- Registro de faltas em datas antigas.
- Historico editavel de faltas.
- Notas editaveis.
- Tarefas.
- Lembretes.
- Calendario.
- Assistente.
- Configuracoes.
- Tutorial interno.
- Perfil personalizavel.
- Backup local.
- Login Supabase preparado.
- PWA Android.

## Validacoes Usadas

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Variaveis Importantes

```env
AI_PROVIDER=openai
AI_API_KEY=
AI_MODEL=gpt-5

GOOGLE_CLASSROOM_CLIENT_ID=
GOOGLE_CLASSROOM_CLIENT_SECRET=
GOOGLE_CLASSROOM_REDIRECT_URI=https://gab-routine.vercel.app/api/classroom/callback

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Proximos Passos Possiveis

- Terminar configuracao das variaveis na Vercel.
- Testar Google Classroom com uma conta real.
- Ativar IA online com chave no servidor.
- Implementar notificacoes push completas.
- Evoluir login e sincronizacao com Supabase.
- Criar wrapper Android nativo se um widget real for necessario no futuro.
