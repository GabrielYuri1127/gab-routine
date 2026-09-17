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
- IA: arquitetura hibrida com regras locais, OpenAI Responses API, contexto da rotina, memoria curta, saida estruturada, fallback e limite por usuario. A ativacao online depende das variaveis de ambiente.
- Google Classroom: OAuth somente leitura, varias contas persistentes por usuario, refresh token criptografado no servidor, sincronizacao posterior, previa e importacao assistida.

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
CLASSROOM_TOKEN_ENCRYPTION_KEY=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Proximos Passos Possiveis

- Terminar configuracao das variaveis na Vercel.
- Rodar o `supabase/schema.sql` atualizado e testar Google Classroom com contas reais.
- Adicionar a chave no servidor e testar a IA online com uma conta autenticada.
- Implementar notificacoes push completas.
- Evoluir a persistencia granular alem do snapshot por usuario.
- Criar wrapper Android nativo se um widget real for necessario no futuro.
