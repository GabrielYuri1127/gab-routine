# Case Study: Gavium

## Ideia

O Gavium surgiu da necessidade de ter um app pessoal para juntar rotina diaria e vida academica em um unico lugar. A ideia principal e evitar que faltas, notas, tarefas, prazos, aulas e lembretes fiquem espalhados entre caderno, mensagens, calendario e plataformas da faculdade.

## Problema

Na rotina de estudante, pequenos dados mudam o semestre inteiro: uma falta antiga nao registrada, uma atividade com prazo, uma nota parcial, uma aula em horario diferente ou uma tarefa urgente. Quando essas informacoes ficam separadas, fica dificil responder perguntas simples:

- O que eu tenho que fazer agora?
- Posso faltar mais alguma aula?
- Qual materia esta em risco?
- Qual prazo vence primeiro?
- O que ja passou e eu esqueci?

## Solucao

O Gavium organiza essas informacoes em uma interface pensada para uso diario no celular. O app abre direto na tela Hoje, com resumo da rotina, e oferece areas especificas para faculdade, tarefas, lembretes, calendario, configuracoes e tutorial.

## Funcionalidades Principais

- Tela Hoje com resumo diario.
- Cadastro e edicao de disciplinas.
- Controle de faltas com data passada, quantidade de aulas, justificativa e historico editavel.
- Controle de notas com calculo de media.
- Simulador academico para entender situacao da disciplina.
- Atividades por prazo.
- Tarefas com prioridade, data, tempo estimado e status.
- Lembretes dentro do app e notificacoes push preparadas para Android.
- Calendario mensal com aulas, tarefas, prazos, lembretes e compromissos.
- Assistente hibrido com regras locais confiaveis e IA online contextual, memoria curta, saida estruturada e comandos automaticos para criar, concluir e reagendar itens quando os dados estao claros.
- Importacao revisavel do Google Classroom por conta.
- Multiplas contas institucionais persistentes, com sincronizacao e desconexao individual.
- Perfil personalizavel com nome do app, usuario, cor, semestre padrao, carga horaria e modulos visiveis.
- Tutorial interno para amigos e familiares aprenderem a usar.
- PWA instalavel no Android.
- Login Supabase com dados separados por usuario quando configurado na Vercel.

## Como Foi Feito

O projeto foi construido como uma aplicacao web moderna com Next.js, TypeScript e Tailwind CSS. A primeira versao continua funcionando com `localStorage`, permitindo uso offline e testes rapidos. Para compartilhamento com varias pessoas, o app usa Supabase Auth e um snapshot de rotina por usuario, isolado por RLS.

A parte academica foi separada em regras reutilizaveis para faltas, horarios, notas e prazos. A interface usa formularios editaveis para que o usuario consiga corrigir dados antigos, adaptar disciplinas e ajustar a rotina sem depender de alteracoes no codigo.

A integracao com Google Classroom foi criada como sincronizacao assistida: o usuario autenticado conecta varias contas, o servidor criptografa os refresh tokens, e cada conta pode ser atualizada, revisada, importada ou desconectada separadamente. Isso evita misturar origens e mantem o usuario no controle.

O assistente usa uma arquitetura hibrida. O motor local calcula prioridades, medias, frequencia, prazos e propostas de acao; a IA online recebe um contexto reduzido da rotina para responder perguntas livres. Alteracoes so sao executadas quando o parser deterministico encontra dados suficientes. Login, limite persistente por usuario, timeout, identificador anonimizado e fallback local protegem custo e disponibilidade.

## Resultado

O resultado atual e um app funcional, responsivo, instalavel no Android como PWA, preparado para uso com varias contas quando Supabase esta configurado, com notificacoes push e uma base profissional para IA contextual. A evolucao natural fica em widgets Android, sincronizacao granular e planos inteligentes de estudo.

## Diferenciais

- Foco real em rotina academica brasileira.
- Registro de faltas antigas e historico editavel.
- Personalizacao para compartilhar com outras pessoas.
- Funcionamento local mesmo sem servicos externos.
- Estrutura pronta para crescer sem refazer o projeto do zero.
