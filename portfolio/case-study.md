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

Os recursos locais podem ser explorados sem credenciais externas. Login, administracao, IA online, Classroom e push dependem de configuracao; sua presenca no codigo nao confirma funcionamento em producao.

- Tela Hoje com resumo diario.
- Cadastro e edicao de disciplinas.
- Controle de faltas com data passada, quantidade de aulas, justificativa e historico editavel.
- Controle de notas com calculo de media.
- Simulador academico para entender situacao da disciplina.
- Atividades por prazo.
- Tarefas com prioridade, data, tempo estimado e status.
- Lembretes dentro do app e notificacoes push preparadas para Android.
- Calendario mensal com aulas, tarefas, prazos, lembretes e compromissos.
- Assistente hibrido com regras locais e integracao de IA online contextual, memoria curta, saida estruturada e comandos para criar, concluir e reagendar itens quando os dados estao claros.
- Importacao revisavel do Google Classroom por conta.
- Multiplas contas institucionais persistentes, com sincronizacao e desconexao individual.
- Perfil personalizavel com nome do app, usuario, cor, semestre padrao, carga horaria e modulos visiveis.
- Tutorial interno para amigos e familiares aprenderem a usar.
- PWA instalavel no Android.
- Login Supabase com dados separados por usuario quando configurado na Vercel.
- Painel administrativo com consentimento temporario e auditoria quando Supabase e a conta administrativa estao configurados.

## Como Foi Feito

O projeto usa Next.js, TypeScript e Tailwind CSS. O modo local utiliza `localStorage` para persistencia no mesmo navegador. Isso nao garante que todos os recursos funcionem offline. Quando configurado, Supabase Auth e um snapshot de rotina por usuario permitem persistencia em nuvem com isolamento por RLS.

A parte academica foi separada em regras reutilizaveis para faltas, horarios, notas e prazos. A interface usa formularios editaveis para que o usuario consiga corrigir dados antigos, adaptar disciplinas e ajustar a rotina sem depender de alteracoes no codigo.

A integracao com Google Classroom foi criada como sincronizacao assistida: o usuario autenticado conecta varias contas, o servidor criptografa os refresh tokens, e cada conta pode ser atualizada, revisada, importada ou desconectada separadamente. Isso evita misturar origens e mantem o usuario no controle.

O assistente usa uma arquitetura hibrida. O motor local calcula prioridades, medias, frequencia, prazos e propostas de acao; quando configurada, a IA online recebe um contexto reduzido da rotina para responder perguntas livres. Alteracoes passam por validacao de comandos. A rota inclui verificacao de login quando Supabase esta ativo, consulta ao historico de uso para limitacao por usuario, limite em memoria como alternativa, timeout e fallback local. Esses mecanismos nao garantem disponibilidade dos servicos externos.

## Resultado

O resultado atual e uma aplicacao com modo local, interface responsiva, estrutura de PWA e integracoes opcionais. A verificacao registrada em [validacao.md](validacao.md) cobre testes automatizados, build e telas locais; nao cobre o funcionamento das integracoes com contas reais. Widgets Android, sincronizacao granular e planos de estudo permanecem como possibilidades de evolucao.

## Diferenciais

- Foco real em rotina academica brasileira.
- Registro de faltas antigas e historico editavel.
- Personalizacao para compartilhar com outras pessoas.
- Funcionamento local mesmo sem servicos externos.
- Regras academicas separadas da interface e cobertas por testes.
