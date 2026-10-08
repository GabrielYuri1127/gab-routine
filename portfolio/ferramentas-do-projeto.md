# Ferramentas Do Projeto

## Frontend

- Next.js App Router.
- React.
- TypeScript.
- Tailwind CSS.
- Componentes locais inspirados em shadcn/ui.
- Lucide Icons.

## Dados E Validacao

- `localStorage` para persistencia local.
- Supabase Auth e tabela `routine_snapshots` para dados separados por usuario.
- Zod para validacao de entrada.
- Tipos TypeScript para modelagem de dominio.
- Regras academicas proprias para faltas, horarios, notas e prazos.

## IA Do Produto

- Assistente local por regras para funcionar sem chave externa.
- Parser local de comandos com execucao automatica quando os dados estao claros.
- Rota `/api/assistant` para resposta no servidor.
- Integracoes com OpenAI e Gemini, com resposta estruturada e fallback local quando o provedor nao pode ser usado.

## Integracoes

- Google Classroom API.
- Google OAuth para conexao de contas.
- Supabase para login, cadastro e persistencia em nuvem quando configurado.
- Painel administrativo dependente de Supabase, papel administrativo e consentimento temporario do usuario.
- Vercel para deploy.

## Mobile E PWA

- Manifest web.
- Service worker.
- Icones PWA.
- Shortcuts para acoes rapidas.
- Instalacao pelo navegador no Android.

## Desenvolvimento

- Git e GitHub para versionamento.
- npm para scripts do projeto.
- TypeScript compiler.
- Test runner nativo do Node.
- Build de producao do Next.js.
