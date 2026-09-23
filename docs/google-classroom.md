# Google Classroom

O Gavium pode importar turmas e trabalhos do Google Classroom para a area Faculdade. A integracao usa OAuth, escopos somente de leitura e suporta varias contas institucionais persistentes por usuario.

## Variaveis

Configure no `.env.local` durante desenvolvimento e na Vercel em producao:

```bash
GOOGLE_CLASSROOM_CLIENT_ID=
GOOGLE_CLASSROOM_CLIENT_SECRET=
GOOGLE_CLASSROOM_REDIRECT_URI=https://seu-dominio.vercel.app/api/classroom/callback
CLASSROOM_TOKEN_ENCRYPTION_KEY=um_segredo_longo_e_aleatorio
```

O app tambem precisa das variaveis do Supabase, incluindo `SUPABASE_SECRET_KEY`, e do `supabase/schema.sql` atualizado. A chave `CLASSROOM_TOKEN_ENCRYPTION_KEY` criptografa os refresh tokens; use um valor proprio e estavel e nao o altere depois de conectar contas.

## Google Cloud

1. Crie ou abra um projeto no Google Cloud Console.
2. Ative a Google Classroom API.
3. Crie uma credencial OAuth Client ID para aplicacao web.
4. Adicione a URL autorizada de redirecionamento:

```text
http://localhost:3000/api/classroom/callback
https://seu-dominio.vercel.app/api/classroom/callback
```

5. Preencha as variaveis do app e rode novamente `supabase/schema.sql`.
6. Entre no Gavium e acesse `/configuracoes`.

Se o Google mostrar `Error 401: invalid_client`, o Client ID salvo na Vercel foi apagado, esta incompleto ou pertence a outra credencial. Crie ou escolha um OAuth Client do tipo **Aplicacao da Web**, copie novamente o Client ID e o Client Secret para a Vercel e confira o redirect exato acima. Depois das alteracoes, faca um novo deploy. O Gavium verifica esse erro antes de abrir a tela do Google sempre que possivel.

Os escopos usados pelo app sao `classroom.courses.readonly` e `classroom.coursework.me.readonly`. Eles permitem listar as turmas e os trabalhos visiveis para a propria conta sem editar dados no Google.

## Mais De Uma Conta

O botao `Adicionar conta Classroom` sempre pede o seletor de conta do Google. Para importar duas contas institucionais:

1. Clique em `Adicionar conta Classroom`.
2. Escolha a primeira conta.
3. Volte para `/configuracoes`, clique em `Sincronizar` e confira a previa.
4. Clique de novo em `Adicionar conta Classroom`.
5. Escolha a segunda conta.
6. Sincronize e importe uma conta por vez ou use `Importar todas`.

O app usa email/id da conta para separar as previas e marcadores nas disciplinas. Assim uma turma com o mesmo nome em contas diferentes nao fica sem origem.

## O que entra no app

- Cursos ativos viram disciplinas.
- Trabalhos com `dueDate` viram atividades com prazo.
- `dueTime` vira horario; sem horario, o app usa `23:59`.
- Links do Classroom ficam guardados nas observacoes da disciplina ou atividade.
- Cada conta conectada fica separada na previa antes da importacao.
- `Sincronizar` busca as mudancas sem exigir um novo login no Google.
- `Verificar conexoes` renova o token e testa diretamente a leitura de turmas e trabalhos. A tela avisa quando uma conta precisa ser reconectada.
- `Desconectar` revoga o acesso no Google e remove a conexao salva.
- Ao conectar novamente, o Google mostra o seletor de conta.
- Itens sem data nao viram atividades, porque nao entram bem na agenda.

O refresh token do Google nunca vai para o navegador. Ele fica criptografado no servidor, em `classroom_connections`, sem politica de acesso direto pelo cliente. O diagnostico tambem roda no servidor e devolve somente o estado da conexao. O `localStorage` guarda apenas a previa dos cursos e trabalhos, nunca credenciais.
