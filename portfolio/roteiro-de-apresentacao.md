# Roteiro De Apresentacao

## Pitch Curto

Gavium e um app pessoal e academico mobile-first para organizar rotina, faltas, notas, tarefas, prazos e lembretes. Tem modo local e integracoes opcionais com Supabase, Google Classroom e assistente online.

## Como Demonstrar

1. Abra a tela Hoje e mostre o resumo diario.
2. Entre em Faculdade e mostre as disciplinas.
3. Abra uma disciplina e mostre faltas, notas, atividades e personalizacao.
4. Registre uma falta em data passada para mostrar o controle historico.
5. Abra Tarefas e mostre prioridade, adiamento e conclusao.
6. Abra Calendario e mostre como os dados aparecem juntos.
7. Abra o Assistente e pergunte: "O que devo fazer agora?"
8. Se Supabase estiver configurado, demonstre Login com uma conta de teste. Sem configuracao, explique a diferenca para o modo local.
9. Abra Configuracoes e mostre perfil, backup e tutorial. Demonstre Classroom apenas se OAuth e uma conta autorizada estiverem disponiveis.
10. Abra o app no celular ou explique a instalacao como PWA no Android.

## Pontos Para Destacar

- O projeto resolve uma dor real de organizacao academica.
- A interface foi pensada primeiro para celular.
- O app persiste dados localmente e possui integracao de login para separar dados por usuario quando configurada.
- O usuario pode editar e corrigir dados antigos.
- A arquitetura separa regras academicas da interface.
- As integracoes externas estao no codigo, mas devem ser apresentadas conforme sua configuracao e validacao, sem prometer funcionamento nao demonstrado.

## Texto Para Portfolio

Gavium e um projeto pessoal para centralizar rotina, disciplinas, faltas, notas, atividades e tarefas. Utiliza Next.js, TypeScript e Tailwind CSS, com persistencia local e estrutura de PWA. O codigo inclui login e persistencia Supabase, acesso administrativo com consentimento, Google Classroom e assistente hibrido. Essas integracoes dependem de configuracao; a verificacao documentada cobre o ambiente local, os testes automatizados e o build.
