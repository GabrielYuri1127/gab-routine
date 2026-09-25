# Acesso Administrativo Com Consentimento

O Gavium permite suporte administrativo sem entregar acesso irrestrito aos dados. O usuario controla o consentimento e o servidor valida a permissao novamente em cada alteracao.

## Ativacao

1. Execute o `supabase/schema.sql` atualizado no SQL Editor do Supabase.
2. Crie uma conta normal e exclusiva para administracao no Gavium.
3. Salve o email dessa conta em `GAVIUM_ADMIN_EMAILS` na Vercel.
4. Faca um novo deploy.
5. Entre com a conta administrativa e abra `/admin`.

Para varias contas administrativas:

```env
GAVIUM_ADMIN_EMAILS=admin@seu-dominio.com,suporte@seu-dominio.com
```

Como alternativa, um backend confiavel pode definir `app_metadata.role` como `admin` ou `owner` no usuario do Supabase. Nunca use `user_metadata` para conceder esse papel, pois esse campo pertence ao proprio usuario.

## Fluxo De Autorizacao

1. O usuario abre `Configuracoes > Acesso de suporte`.
2. Escolhe a duracao e se permite edicao.
3. O administrador passa a ver apenas essa conta no painel.
4. Cada edicao atualiza a rotina e grava a auditoria na mesma transacao.
5. Ao vencer o prazo ou ocorrer revogacao, novas leituras e escritas sao bloqueadas.

O painel permite corrigir perfil, disciplinas, tarefas, lembretes e atividades ja existentes. Ele nao oferece acesso a senhas, sessoes de login, refresh tokens do Classroom ou chaves privadas.
