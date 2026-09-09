# Deploy Na Vercel

Este guia resume como publicar o GAB ROUTINE usando o repositorio do GitHub.

## Repositorio

```text
https://github.com/GabrielYuri1127/gab-routine.git
```

## Configuracao Recomendada

- Framework Preset: `Next.js`
- Branch de producao: `main`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: deixar o padrao da Vercel para Next.js

## Variaveis De Ambiente

Configure em `Project Settings > Environment Variables`.

Para IA online:

```env
AI_PROVIDER=openai
AI_API_KEY=sua_chave_openai
AI_MODEL=gpt-5
```

Para Google Classroom:

```env
GOOGLE_CLASSROOM_CLIENT_ID=seu_client_id
GOOGLE_CLASSROOM_CLIENT_SECRET=seu_client_secret
GOOGLE_CLASSROOM_REDIRECT_URI=https://gab-routine.vercel.app/api/classroom/callback
```

Para Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
```

Para notificacoes push futuras:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=sua_chave_publica
VAPID_PRIVATE_KEY=sua_chave_privada
```

## Ambientes

Na Vercel, marque as variaveis em `Production` para o site principal. Quando quiser testar antes de ir para o publico, marque tambem `Preview`.

Mudancas em variaveis de ambiente so entram em novos deploys. Depois de salvar ou editar variaveis, faca um novo deploy.

## Google Cloud

No OAuth Client ID do Google Cloud, adicione exatamente este redirect para producao:

```text
https://gab-routine.vercel.app/api/classroom/callback
```

Para testar localmente, adicione tambem:

```text
http://localhost:3000/api/classroom/callback
```

## Checklist Rapido

1. Confirmar que o repositorio esta atualizado no GitHub.
2. Importar o repositorio na Vercel.
3. Conferir que o preset esta como Next.js.
4. Adicionar as variaveis necessarias.
5. Fazer novo deploy.
6. Abrir `/configuracoes` e testar Google Classroom.
7. Abrir `/assistente` e testar a IA.
8. Abrir o site no Android e usar `Adicionar a tela inicial`.

## Referencias

- Vercel Git: https://vercel.com/docs/git
- Vercel Environment Variables: https://vercel.com/docs/environment-variables
- Vercel Environments: https://vercel.com/docs/deployments/environments
