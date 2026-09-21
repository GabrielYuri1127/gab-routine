# Importacao academica

O painel `Faculdade` aceita documentos em PDF, JPG, PNG e WebP para acelerar o cadastro do curso.

## Documentos aceitos

- Horario ou grade semanal: reconhece disciplinas, dias, horarios, professor e sala quando estiverem legiveis.
- Historico ou analitico: reconhece disciplinas concluidas, em andamento, reprovadas ou trancadas, carga horaria e periodo.
- Matriz curricular: reconhece disciplinas planejadas, periodo recomendado, carga total e duracao do curso.

## Fluxo seguro

1. O usuario escolhe `Importar` em `/faculdade` e envia um arquivo de ate 4 MB.
2. Imagens grandes sao reduzidas no proprio navegador antes do envio.
3. A rota autenticada envia o documento ao provedor de IA sem expor `AI_API_KEY` ao navegador.
4. O arquivo nao e salvo no Gavium. A resposta estruturada passa por validacao e normalizacao.
5. O usuario revisa e edita cada disciplina antes de aplicar.
6. Disciplinas sao comparadas primeiro pelo codigo e depois pelo nome normalizado.
7. Cadastros existentes preservam notas, faltas, atividades e materiais; apenas dados academicos preenchidos e novos horarios sao mesclados.
8. Os dados do curso atualizam o percentual de integralizacao automaticamente.

O analisador trata todo texto dentro do documento como conteudo nao confiavel e ignora instrucoes que possam aparecer no arquivo.

## Configuracao

A importacao usa as mesmas variaveis da IA do assistente:

```bash
AI_PROVIDER=openai
AI_API_KEY=
AI_MODEL=gpt-5
```

Quando Supabase esta configurado, a rota exige uma sessao autenticada. O limite atual e de seis analises a cada quinze minutos por usuario ou endereco de rede.
