# Android widget futuro

O GAB ROUTINE continua sendo uma PWA como base gratuita. Para widget real de tela inicial no Android, nao vale criar um "widget" falso em HTML: sera preciso um wrapper nativo.

Opcoes futuras:

- Capacitor com plugin nativo de AppWidget.
- Wrapper Android simples usando WebView para o app e um `AppWidgetProvider` nativo.
- AppWidget nativo consumindo uma API autenticada do GAB ROUTINE.

API planejada:

```http
GET /api/widget/today
```

Resposta prevista:

```json
{
  "nextEvent": null,
  "nextClass": null,
  "tasks": [],
  "nextDeadline": null,
  "academicAlert": null
}
```

A rota deve exigir autenticacao. Na Fase 6, ela pode usar Supabase Auth e retornar somente dados do usuario logado.
