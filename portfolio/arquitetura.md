# Decisoes Tecnicas: Gab Routine / Gavium

## Caminho Dos Dados

A interface em `app/` usa componentes em `components/` e modulos em `features/`. O estado compartilhado fica em `features/data/routine-store.ts`. As regras de dominio ficam separadas em `lib/academic-rules/`, para que calculos de notas, frequencia, horarios e prazos possam ser verificados sem depender de uma tela.

O modo local salva a rotina no navegador. Quando configurado, `services/persistence/supabase-repository.ts` integra a persistencia ao Supabase, com autenticacao e politicas de acesso por usuario definidas em `supabase/schema.sql`.

## Integracoes

| Parte | Implementacao | Condicao Para Uso |
| --- | --- | --- |
| Rotina e regras academicas | `lib/academic-rules/`, `features/data/` | Modo local disponivel sem credenciais externas. |
| Login e nuvem | Supabase Auth e repositorio de persistencia | Variaveis de ambiente, schema e autenticacao configurados. |
| Administracao com consentimento | `app/admin/`, `app/api/admin/`, `lib/admin/` | Supabase, schema, credencial de servidor, papel administrativo e autorizacao temporaria do usuario. |
| Assistente | `services/ai/`, `lib/ai/`, `app/api/assistant/` | IA online depende de provedor e chave no servidor. |
| Google Classroom | `app/api/classroom/` e guias em `docs/` | OAuth, credenciais e permissao da conta Google. |
| Lembretes push | `services/notifications/`, `app/api/notifications/` | HTTPS, chaves VAPID e agendamento configurados. |
| Instalacao PWA | `public/manifest.webmanifest` e `public/sw.js` | Instalacao pelo navegador em ambiente HTTPS. |

As chaves privadas sao usadas no servidor. A sincronizacao com Classroom passa por revisao antes da importacao, e o assistente utiliza validacao de comandos para alterar dados estruturados.

## O Que Este Projeto Permite Discutir Em Uma Entrevista

- Como separar regras academicas da interface.
- Como manter um modo local e integrar autenticacao e persistencia em nuvem.
- Como tratar calculos de frequencia, media, prazos e horarios em testes.
- Como conectar APIs externas e lidar com credenciais, permissoes e indisponibilidade.
- Como transformar um aplicativo web responsivo em uma PWA.
- Como validar comandos de um assistente antes de alterar a rotina.

## Verificacao

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Esses comandos verificam tipos, regras de lint, testes automatizados e compilacao. Eles nao substituem testes com contas reais de Supabase, acesso administrativo, Google Classroom, provedores de IA ou dispositivos com notificacoes push.

## Proximos Passos

Veja [status-e-roadmap.md](status-e-roadmap.md) para recursos que ainda dependem de ativacao e para melhorias planejadas. A apresentacao do projeto deve refletir essa separacao entre implementacao existente e servicos efetivamente configurados.
