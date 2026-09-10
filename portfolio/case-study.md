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
- Lembretes dentro do app.
- Calendario mensal com aulas, tarefas, prazos, lembretes e compromissos.
- Assistente de IA com respostas baseadas nos dados cadastrados.
- Importacao do Google Classroom por conta.
- Suporte a mais de uma conta institucional do Google Classroom.
- Perfil personalizavel com nome do app, usuario, cor, semestre padrao, carga horaria e modulos visiveis.
- Tutorial interno para amigos e familiares aprenderem a usar.
- PWA instalavel no Android.
- Preparacao para Supabase e deploy na Vercel.

## Como Foi Feito

O projeto foi construido como uma aplicacao web moderna com Next.js, TypeScript e Tailwind CSS. A primeira versao usa `localStorage`, permitindo que o app funcione sem banco de dados e sem login obrigatorio. Isso facilita testar, compartilhar e usar no celular.

A parte academica foi separada em regras reutilizaveis para faltas, horarios, notas e prazos. A interface usa formularios editaveis para que o usuario consiga corrigir dados antigos, adaptar disciplinas e ajustar a rotina sem depender de alteracoes no codigo.

A integracao com Google Classroom foi criada como importacao assistida: o usuario conecta a conta, revisa uma previa e decide quando importar. Isso evita misturar dados automaticamente e ajuda quem tem mais de uma conta institucional.

## Resultado

O resultado atual e um app funcional, responsivo, instalavel no Android como PWA e preparado para evoluir para sincronizacao em nuvem, notificacoes push completas, widgets Android e recursos mais avancados de IA.

## Diferenciais

- Foco real em rotina academica brasileira.
- Registro de faltas antigas e historico editavel.
- Personalizacao para compartilhar com outras pessoas.
- Funcionamento local mesmo sem servicos externos.
- Estrutura pronta para crescer sem refazer o projeto do zero.
