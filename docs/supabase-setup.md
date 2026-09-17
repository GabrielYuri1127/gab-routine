# Supabase Para Login E Dados Por Usuario

O Supabase e a parte que transforma o Gavium de app local em app compartilhavel. Sem ele, cada navegador salva tudo no proprio aparelho. Com ele, cada pessoa entra com email e senha e recebe um espaco proprio no banco.

## O Que Configurar

No Supabase:

1. Crie um projeto.
2. Abra `SQL Editor`.
3. Cole e execute todo o conteudo de `supabase/schema.sql`.
4. Abra `Authentication > Providers`.
5. Ative login por email e senha.
6. Em `Authentication > URL Configuration`, use a URL de producao como `Site URL`.
7. Em `Redirect URLs`, adicione `https://gab-routine.vercel.app/login?recovery=1` e a equivalente local.

## Emails Para Amigos E Familiares

Para usuarios reais confirmarem cadastro e recuperarem senha, configure um SMTP proprio em `Authentication > Emails > SMTP Settings`. O provedor padrao do Supabase e apenas para testes, aceita somente enderecos autorizados da equipe e tem limite muito baixo de envio.

Depois do SMTP, teste cadastro, confirmacao e `Esqueci minha senha` com um email que nao pertence a equipe do projeto.

Na Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua_chave_publicavel
SUPABASE_SECRET_KEY=sua_chave_secreta
```

Use `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` no navegador. Use `SUPABASE_SECRET_KEY` somente no servidor, porque ela permite que as rotas protegidas salvem notificacoes, limites da IA e conexoes do Classroom.

## Como Testar

1. Faca novo deploy na Vercel depois de salvar as variaveis.
2. Abra `/login`.
3. Crie a conta `teste1`.
4. Cadastre uma disciplina, uma falta e uma tarefa.
5. Saia da conta.
6. Crie a conta `teste2`.
7. Confirme que ela comeca vazia.
8. Saia e entre novamente em `teste1`.
9. Confirme que os dados de `teste1` voltaram.
10. Use `Esqueci minha senha`, abra o email e salve uma nova senha.

Se os dados misturarem, pare e confira se `supabase/schema.sql` foi executado inteiro e se as politicas RLS existem.

## Tabelas Mais Importantes

- `routine_snapshots`: guarda o estado completo do app por usuario.
- `push_subscriptions`: guarda os aparelhos que aceitaram notificacoes.
- `classroom_connections`: guarda por usuario apenas os metadados e o refresh token criptografado das contas Google conectadas.
- `tasks`, `reminders`, `subjects`, `grades` e outras tabelas ficam preparadas para sincronizacao granular futura.

## Regras De Seguranca

Todas as tabelas principais usam `user_id` e Row Level Security. A politica `own rows` limita leitura e escrita para o dono dos dados. `classroom_connections` nao tem politica para o navegador: somente rotas autenticadas do servidor podem acessa-la.

Nunca coloque `SUPABASE_SECRET_KEY` no frontend, no README publico com valor real, nem em variavel `NEXT_PUBLIC_`.
