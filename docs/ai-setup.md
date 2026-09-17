# IA No Gavium

O app funciona sem chave externa usando a IA local por regras. Para ativar resposta por API no deploy:

```bash
AI_PROVIDER=openai
AI_API_KEY=sua_chave
AI_MODEL=gpt-5
```

Essas variaveis devem ficar no servidor, como variaveis de ambiente da Vercel. Nunca coloque `AI_API_KEY` em variavel `NEXT_PUBLIC_`.

## Como Funciona

- A tela `/assistente` envia a pergunta e o contexto para `/api/assistant`.
- O servidor calcula uma resposta segura com regras locais, incluindo base da resposta, avisos de dados faltantes e proximos passos.
- Perguntas como "o que falta?" ou "o que falta para publicar?" usam o status real de Vercel, IA online, Google Classroom e Supabase, sem confundir com faltas de aula.
- Comandos claros de alteracao viram uma acao automatica. O app salva falta, nota, atividade ou tarefa direto quando reconhece os dados essenciais, e pede complemento quando faltam disciplina, data, nota ou titulo.
- Se `AI_PROVIDER=openai` e `AI_API_KEY` existirem, a API responde a pergunta usando o contexto real da rotina e as ultimas mensagens da conversa. Numeros, datas, links e acoes continuam ancorados no calculo local.
- Quando Supabase esta configurado, somente usuarios autenticados consomem a IA online. Pessoas sem login continuam usando o modo local.
- O servidor aplica limite temporario por usuario, timeout e identificador anonimizado. Quando a chave secreta do Supabase esta disponivel, o uso fica registrado em `ai_usage`; sem ela, existe contingencia em memoria. A requisicao usa `store: false`.
- Se a API falhar, o app volta automaticamente para a resposta local.
- O estilo em Configuracoes muda o tom do assistente entre direto, equilibrado e mais orientador.

## Comandos Ja Suportados

Exemplos que o assistente entende e salva direto:

```text
registre 2 faltas em Redes ontem
adicione nota 8,5 da prova em Redes
crie prova de Redes dia 20
prova de Redes amanha
me lembre de levar o carregador amanha as 8h
tenho dentista sexta 15h
reuniao do projeto sexta 15:30
crie tarefa comprar livro amanha urgente
comprar pilha amanha
terminei o relatorio
marque comprar livro como concluida
mova comprar livro para amanha as 14h
```

Depois de entender o comando, o app usa as mesmas funcoes internas das telas manuais para salvar ou atualizar os dados e mostra uma mensagem de conclusao. Se duas tarefas tiverem nomes ambiguos, nenhuma alteracao e executada automaticamente.

## Limite Atual

Sem `AI_API_KEY`, o app nao conversa com uma IA externa. Mesmo assim, ele responde usando regras locais para rotina, faltas, notas, prazos e status de publicacao. A IA online interpreta perguntas livres, considera o contexto e mantem continuidade curta, enquanto calculos e alteracoes continuam validados pelo sistema.
