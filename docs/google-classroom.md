# Google Classroom

O Gab routine pode importar turmas e trabalhos do Google Classroom para a area Faculdade. A integracao usa OAuth, escopos somente de leitura e suporta mais de uma conta institucional.

## Variaveis

Configure no `.env.local` durante desenvolvimento e na Vercel em producao:

```bash
GOOGLE_CLASSROOM_CLIENT_ID=
GOOGLE_CLASSROOM_CLIENT_SECRET=
GOOGLE_CLASSROOM_REDIRECT_URI=https://seu-dominio.vercel.app/api/classroom/callback
```

## Google Cloud

1. Crie ou abra um projeto no Google Cloud Console.
2. Ative a Google Classroom API.
3. Crie uma credencial OAuth Client ID para aplicacao web.
4. Adicione a URL autorizada de redirecionamento:

```text
http://localhost:3000/api/classroom/callback
https://seu-dominio.vercel.app/api/classroom/callback
```

5. Preencha as variaveis do app e acesse `/configuracoes`.

## O que entra no app

- Cursos ativos viram disciplinas.
- Trabalhos com `dueDate` viram atividades com prazo.
- `dueTime` vira horario; sem horario, o app usa `23:59`.
- Links do Classroom ficam guardados nas observacoes da disciplina ou atividade.
- Cada conta conectada fica separada na previa antes da importacao.
- Ao conectar novamente, o Google mostra o seletor de conta.
- Itens sem data nao viram atividades, porque nao entram bem na agenda.

O token do Google e usado apenas no callback do servidor para buscar os dados e nao fica salvo no `localStorage`.
