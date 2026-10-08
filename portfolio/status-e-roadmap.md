# Status E Roadmap

## Status Atual

O Gavium tem uma versao local verificada e integracoes implementadas no codigo. Este documento separa implementacao, configuracao externa e possibilidades futuras. Consulte [validacao.md](validacao.md) para saber o que foi efetivamente testado; nao foi feita uma auditoria da configuracao de producao.

## Implementado No Codigo

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
- Integracoes de IA online com OpenAI e Gemini, dependentes de credenciais e disponibilidade dos provedores.
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
- Administracao com consentimento temporario do usuario e auditoria de alteracoes.
- Deploy via GitHub e Vercel.

## Dependente De Configuracao E Validacao

- Conferencia das variaveis, schema e permissoes no ambiente de producao.
- Teste de login, isolamento de dados e consentimento administrativo com contas reais.
- Teste de Google Classroom com OAuth e contas institucionais autorizadas.
- Teste de IA online com credenciais apenas no servidor.
- Teste de Web Push com VAPID, Supabase, agendamento e dispositivo compativel.
- Avaliacao de uso com outras pessoas, sem resultado de usabilidade registrado nesta verificacao.

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
