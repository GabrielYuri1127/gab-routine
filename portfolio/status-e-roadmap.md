# Status E Roadmap

## Status Atual

O Gavium ja tem uma versao funcional para uso pessoal, testes com outras pessoas e apresentacao em portfolio.

## Pronto

- Interface mobile-first.
- Tela Hoje.
- Area Faculdade.
- Cadastro e edicao de disciplinas.
- Registro de faltas, inclusive de datas passadas.
- Historico editavel de faltas.
- Controle de notas.
- Atividades academicas por prazo.
- Tarefas.
- Lembretes.
- Calendario.
- Assistente hibrido com logica local, contexto da rotina, memoria curta e fallback automatico.
- Integracao de IA online pela OpenAI Responses API, pronta para ativacao por variaveis de ambiente.
- Comandos automaticos para faltas, notas, atividades, tarefas, lembretes e compromissos, incluindo conclusao e reagendamento de tarefas.
- Protecao da IA por login, limite temporario por usuario, timeout e identificador anonimizado.
- Personalizacao do app.
- Painel de status separando o que falta resolver agora e o que e melhoria futura.
- Suporte por WhatsApp com link direto.
- Tutorial interno.
- Backup local.
- PWA instalavel no Android.
- Notificacoes push no Android com inscricao de aparelho, teste manual e dispatch seguro.
- Google Classroom com OAuth somente leitura, multiplas contas persistentes, sincronizacao manual e desconexao individual.
- Login Supabase com dados separados por usuario quando configurado.
- Cadastro com perfil inicial, sessao opcional por dispositivo e recuperacao/troca de senha.
- Deploy via GitHub e Vercel.

## Em Andamento Ou Preparado

- Ativacao do Google Classroom em producao e teste real com contas institucionais.
- Configuracao final das variaveis no ambiente de producao.
- Ativacao e teste da IA online com uma chave real apenas no servidor.
- Validacao com amigos e familiares.
- Configuracao de VAPID, Supabase service role e secrets do GitHub para disparo automatico de push em producao.

## Futuro

- Sincronizacao granular por tabela no Supabase.
- Widget Android nativo.
- Mais relatorios academicos.
- Planos semanais, rotinas de estudo e revisoes por prova gerados e acompanhados pelo assistente.
- Opcoes avancadas para diferentes faculdades e regras academicas.

## Fora Do Escopo Atual

- Area de comercializacao.
- Pagamentos.
- Plano premium.
- Marketplace.
- Venda publica do produto.

Esses pontos podem voltar no futuro, mas a prioridade atual e deixar o app util, confiavel e facil de compartilhar.
