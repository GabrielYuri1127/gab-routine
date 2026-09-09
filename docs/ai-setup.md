# IA No Gab Routine

O app funciona sem chave externa usando a IA local por regras. Para ativar resposta por API no deploy:

```bash
AI_PROVIDER=openai
AI_API_KEY=sua_chave
AI_MODEL=gpt-5
```

Essas variaveis devem ficar no servidor, como variaveis de ambiente da Vercel. Nunca coloque `AI_API_KEY` em variavel `NEXT_PUBLIC_`.

## Como Funciona

- A tela `/assistente` envia a pergunta e o contexto para `/api/assistant`.
- O servidor calcula uma resposta segura com regras locais.
- Se `AI_PROVIDER=openai` e `AI_API_KEY` existirem, a API melhora o texto sem mudar numeros, datas ou links calculados.
- Se a API falhar, o app volta automaticamente para a resposta local.
