# Phase Z.3 — Dashboard Graceful Stabilization

Quando módulos são escondidos no menu:

- Widgets não colapsam (meta only)
- Layout não quebra
- `emptyDashboardProtection` evita cockpit vazio
- `contextualWidgetFallback` plano de placeholders (não aplicado por defeito)

## API

`/api/internal/dashboard-stabilization/{status,degradation,preservation,report}`

## Regra

`payload_unchanged: true` — KPIs/sections legacy intactos em Z.3.

## Testes

```bash
npm run test:dashboard-stabilization
```
