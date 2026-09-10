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
- Testar registro de falta em data passada.
- Testar criacao de tarefa e lembrete.

## Vercel

- Confirmar ultimo commit no GitHub.
- Confirmar deploy sem erro na Vercel.
- Conferir se a URL de producao abre no celular.
- Conferir se o manifesto PWA aparece corretamente.
- Instalar no Android pelo navegador.

## Google Classroom

- Ativar a Google Classroom API no Google Cloud.
- Configurar OAuth Client ID.
- Adicionar redirect local e de producao.
- Configurar variaveis na Vercel.
- Conectar uma conta institucional.
- Conectar uma segunda conta institucional se necessario.
- Verificar se as contas aparecem separadas antes da importacao.

## IA

- Confirmar se o app funciona sem chave externa.
- Configurar `AI_PROVIDER`, `AI_API_KEY` e `AI_MODEL` apenas no servidor.
- Fazer novo deploy depois de mudar variaveis.
- Perguntar no assistente: `O que devo fazer agora?`
- Conferir se a resposta mostra base e dados faltantes.

## Portfolio

- Atualizar prints do app depois do deploy.
- Usar `portfolio/case-study.md` como texto base.
- Usar `portfolio/roteiro-de-apresentacao.md` para demonstrar.
- Explicar que a comercializacao nao e foco da versao atual.
