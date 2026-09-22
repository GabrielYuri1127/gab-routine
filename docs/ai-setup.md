# IA No Gavium

O Assistente usa sempre a IA online. Para ativar as respostas no deploy:

```bash
AI_PROVIDER=openai
AI_API_KEY=sua_chave
AI_MODEL=gpt-5
```

Essas variaveis devem ficar no servidor, como variaveis de ambiente da Vercel. Nunca coloque `AI_API_KEY` em variavel `NEXT_PUBLIC_`.

## Como Funciona

- A tela `/assistente` envia toda pergunta para `/api/assistant`, que chama a OpenAI.
- O servidor calcula contexto seguro com regras internas para ancorar numeros, datas, links, alertas e comandos. Esse calculo nao e exibido como resposta alternativa.
- Abrir a tela nao faz uma chamada paga de teste; a chave e o modelo sao validados na primeira pergunta.
- Perguntas como "o que falta?" ou "o que falta para publicar?" usam o status real de Vercel, IA online, Google Classroom e Supabase, sem confundir com faltas de aula.
- Comandos claros de alteracao viram uma acao automatica. O app salva falta, nota, atividade ou tarefa direto quando reconhece os dados essenciais, e pede complemento quando faltam disciplina, data, nota ou titulo.
- A API usa contexto reduzido da rotina e ate seis mensagens recentes. Numeros, datas, links e acoes continuam ancorados na validacao interna.
- Quando Supabase esta configurado, somente usuarios autenticados podem usar o Assistente.
- O servidor aplica limite temporario por usuario, timeout e identificador anonimizado. Quando a chave secreta do Supabase esta disponivel, o uso fica registrado em `ai_usage`; sem ela, existe contingencia em memoria. A requisicao usa `store: false`.
- Se a API falhar, o app mostra o erro e nao executa comandos nem produz uma resposta local.
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

## Requisitos De Uso

Sem `AI_API_KEY`, creditos disponiveis e um modelo liberado para a chave, o Assistente nao responde. O erro correspondente aparece na propria tela. Ao alterar a chave ou o modelo na Vercel, e necessario fazer um novo deploy; ao apenas adicionar creditos ou elevar o limite da mesma conta da OpenAI, nao e necessario redeploy.
