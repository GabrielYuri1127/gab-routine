# Supabase Para Login E Dados Por Usuario

O Supabase e a parte que transforma o Gavium de app local em app compartilhavel. Sem ele, cada navegador salva tudo no proprio aparelho. Com ele, cada pessoa entra com email e senha e recebe um espaco proprio no banco.

## O Que Configurar

No Supabase:

1. Crie um projeto.
2. Abra `SQL Editor`.
3. Cole e execute todo o conteudo de `supabase/schema.sql`.
4. Abra `Authentication > Providers`.
5. Ative login por email e senha.
6. Em `Authentication > URL Configuration`, adicione a URL de producao do app.

Na Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
```

Use `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` no navegador. Use `SUPABASE_SERVICE_ROLE_KEY` somente no servidor, porque ela permite que as rotas protegidas do app salvem inscricoes de notificacao.

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

Se os dados misturarem, pare e confira se `supabase/schema.sql` foi executado inteiro e se as politicas RLS existem.

## Tabelas Mais Importantes

- `routine_snapshots`: guarda o estado completo do app por usuario.
- `push_subscriptions`: guarda os aparelhos que aceitaram notificacoes.
- `tasks`, `reminders`, `subjects`, `grades` e outras tabelas ficam preparadas para sincronizacao granular futura.

## Regras De Seguranca

Todas as tabelas principais usam `user_id` e Row Level Security. A politica `own rows` limita leitura e escrita para o dono dos dados.

Nunca coloque `SUPABASE_SERVICE_ROLE_KEY` no frontend, no README publico com valor real, nem em variavel `NEXT_PUBLIC_`.
