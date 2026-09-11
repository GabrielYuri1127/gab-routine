# Notificacoes Push No Android

O Gavium usa Web Push para enviar lembretes para o PWA instalado no Android.

## Variaveis

Na Vercel, configure:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=sua_chave_publica
VAPID_PRIVATE_KEY=sua_chave_privada
VAPID_SUBJECT=mailto:seu-email@exemplo.com
CRON_SECRET=um_segredo_longo
SUPABASE_SECRET_KEY=sua_chave_secreta
```

Gere as chaves VAPID com:

```bash
npm run vapid
```

## Banco

Rode novamente `supabase/schema.sql` no SQL Editor. Ele cria/atualiza `push_subscriptions` com:

- usuario dono da inscricao;
- endpoint do aparelho;
- chaves `p256dh` e `auth`;
- identificacao simples do navegador;
- RLS para cada usuario ver somente os proprios dados.

## Ativar No App

1. Entre em `/login`.
2. Abra `/configuracoes`.
3. Toque em `Ativar` no painel de notificacoes.
4. Aceite a permissao do navegador.
5. Use `Testar`.

No Android, o ideal e instalar o PWA pelo Chrome ou Edge antes de ativar.

## Disparo Automatico

A rota segura fica em:

```http
POST /api/notifications/dispatch
Authorization: Bearer CRON_SECRET
```

O repositorio tambem tem `.github/workflows/notifications.yml`, que chama essa rota a cada 10 minutos.

Configure estes secrets no GitHub:

```text
CRON_SECRET=mesmo_valor_da_vercel
NOTIFICATION_DISPATCH_URL=https://gab-routine.vercel.app/api/notifications/dispatch
```

Quando a rota roda, ela procura lembretes vencidos nos snapshots do Supabase, envia push para os aparelhos inscritos e marca esses lembretes como enviados.

## Observacoes

- HTTPS e obrigatorio em producao.
- Se a pessoa bloquear notificacoes no navegador, ela precisa liberar nas configuracoes do Android/navegador.
- Lembretes muito antigos nao sao disparados para evitar enxurrada de notificacoes atrasadas.
