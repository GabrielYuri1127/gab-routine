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
- Se `AI_PROVIDER=openai` e `AI_API_KEY` existirem, a API melhora o texto em JSON estruturado sem mudar numeros, datas ou links calculados.
- Se a API falhar, o app volta automaticamente para a resposta local.
- O estilo em Configuracoes muda o tom do assistente entre direto, equilibrado e mais orientador.

## Comandos Ja Suportados

Exemplos que o assistente entende e salva direto:

```text
registre 2 faltas em Redes ontem
adicione nota 8,5 da prova em Redes
crie prova de Redes dia 20
prova de Redes amanha
crie tarefa comprar livro amanha urgente
comprar pilha amanha
```

Depois de entender o comando, o app usa as mesmas funcoes internas das telas manuais para salvar os dados no backup local e mostra uma mensagem de conclusao.

## Limite Atual

Sem `AI_API_KEY`, o app nao conversa com uma IA externa. Mesmo assim, ele responde usando regras locais para rotina, faltas, notas, prazos e status de publicacao. A IA online entra para deixar a resposta mais natural, menos repetitiva e mais parecida com um assistente real, mas os calculos continuam sendo feitos pelo sistema.
