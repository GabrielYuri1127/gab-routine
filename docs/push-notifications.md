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

Ao abrir o painel, o Gavium confirma a inscricao com o servidor. Se as chaves VAPID tiverem mudado desde a ativacao anterior, o app remove a inscricao antiga e cria outra automaticamente. O teste so mostra sucesso quando pelo menos um aparelho realmente aceitou o envio.

## Disparo Automatico

A rota segura fica em:

```http
POST /api/notifications/dispatch
Authorization: Bearer CRON_SECRET
```

O agendador principal recomendado e o Supabase Cron, que chama a rota a cada minuto sem depender de um navegador aberto. Rode `supabase/notification-cron.sql` no SQL Editor e, no final, execute a chamada comentada trocando o segundo argumento pelo mesmo `CRON_SECRET` salvo na Vercel. A URL de producao ja aparece pronta no arquivo.

O repositorio tambem tem `.github/workflows/notifications.yml`, que tenta chamar a rota a cada 10 minutos como contingencia.

Configure estes secrets no GitHub:

```text
CRON_SECRET=mesmo_valor_da_vercel
NOTIFICATION_DISPATCH_URL=https://gab-routine.vercel.app/api/notifications/dispatch
```

Quando a rota roda, ela procura lembretes vencidos nos snapshots do Supabase, envia push para os aparelhos inscritos e marca esses lembretes como enviados. O Supabase guarda a URL e o segredo criptografados no Vault; eles nao ficam gravados no repositorio nem no texto do job.

O retorno do dispatch inclui `remindersDue`, `sent`, `expiredSubscriptions` e `failureReasons`. Se houver lembrete vencido e todas as entregas falharem, a rota devolve erro para que o GitHub Actions fique vermelho e mostre a causa em vez de registrar um falso sucesso.

## Observacoes

- HTTPS e obrigatorio em producao.
- O GitHub informa oficialmente que workflows agendados podem atrasar ou ate ser descartados em periodos de alta carga. Por isso ele fica como contingencia, nao como unico relogio dos lembretes.
- Se a pessoa bloquear notificacoes no navegador, ela precisa liberar nas configuracoes do Android/navegador.
- Se o Android bloquear notificacoes do Chrome ou do PWA no nivel do sistema, libere em Configuracoes > Apps > Gavium/Chrome > Notificacoes.
- Lembretes muito antigos nao sao disparados para evitar enxurrada de notificacoes atrasadas.
- Sempre que `NEXT_PUBLIC_VAPID_PUBLIC_KEY` ou `VAPID_PRIVATE_KEY` mudar, faca redeploy. Depois abra `/configuracoes` no Android; o app renovara a inscricao.
