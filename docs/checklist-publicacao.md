# Checklist De Publicacao

Use este checklist antes de compartilhar o Gavium com amigos, familiares ou no portfolio.

## Antes De Compartilhar

- Abrir `/configuracoes`.
- Conferir o painel `Status de publicacao`.
- Conferir nome do app, nome do usuario e cor principal.
- Exportar um backup se o navegador ja tiver dados importantes.
- Usar `Restaurar perfil padrao` se quiser enviar o app limpo.
- Testar a tela `/tutorial`.
- Testar o botao de suporte pelo WhatsApp.
- Testar a tela `/assistente`.
- Testar cadastro de uma disciplina nova.
- Testar confirmacao de email, recuperacao e troca de senha.
- Testar registro de falta em data passada.
- Testar criacao de tarefa e lembrete.
- Testar ativacao de notificacoes no Android quando push estiver configurado.

## Vercel

- Confirmar ultimo commit no GitHub.
- Confirmar deploy sem erro na Vercel.
- Conferir se a URL de producao abre no celular.
- Conferir se o manifesto PWA aparece corretamente.
- Instalar no Android pelo navegador.

## Contas E Email

- Configurar `Site URL` e a URL de recuperacao no Supabase Auth.
- Configurar SMTP proprio antes de convidar pessoas fora da equipe do Supabase.
- Criar conta com um email externo, confirmar, sair e entrar novamente.
- Recuperar a senha pelo link recebido.

## Google Classroom

- Ativar a Google Classroom API no Google Cloud.
- Configurar OAuth Client ID.
- Adicionar redirect local e de producao.
- Configurar variaveis na Vercel.
- Configurar `CLASSROOM_TOKEN_ENCRYPTION_KEY` e rodar o `supabase/schema.sql` atualizado.
- Conectar uma conta institucional.
- Conectar uma segunda conta institucional se necessario.
- Sincronizar novamente sem refazer o OAuth.
- Desconectar uma conta de teste e confirmar a remocao.
- Verificar se as contas aparecem separadas antes da importacao.

## IA

- Confirmar que o Assistente informa claramente quando nenhuma IA online esta configurada.
- Configurar `AI_PROVIDER=auto`, `OPENAI_API_KEY` e/ou `GEMINI_API_KEY` apenas no servidor.
- Confirmar que o Gemini responde mesmo quando a OpenAI esta sem saldo.
- Fazer novo deploy depois de mudar variaveis.
- Perguntar no assistente: `O que devo fazer agora?`
- Conferir se a resposta mostra base e dados faltantes.

## Notificacoes Push

- Rodar `npm run vapid` e guardar as chaves.
- Configurar `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` e `CRON_SECRET` na Vercel.
- Opcional: configurar `CRON_SECRET` e `NOTIFICATION_DISPATCH_URL` nos secrets do GitHub para o acionamento manual de emergencia.
- Rodar `supabase/notification-cron.sql` e confirmar o job `gavium-notification-dispatch` ativo.
- Rodar novamente `supabase/schema.sql`.
- Entrar no app pelo Android.
- Ativar notificacoes em `/configuracoes`.
- Enviar um teste.

## Portfolio

- Atualizar prints do app depois do deploy.
- Usar `portfolio/case-study.md` como texto base.
- Usar `portfolio/roteiro-de-apresentacao.md` para demonstrar.
- Explicar que a comercializacao nao e foco da versao atual.
