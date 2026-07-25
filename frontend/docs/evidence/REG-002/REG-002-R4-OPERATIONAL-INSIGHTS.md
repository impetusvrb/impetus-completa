# REG-002 R4 — Operational Insights Recovery

**Fase:** REG-002

---

## Diagnóstico

Cadeia HTTP `/api/dashboard/insights` já estava íntegra.  
Regressão perceptível = guard mismatch + deep-link ausente no CenterWidget.

## Alterações

| Acção | Ficheiro |
|-------|----------|
| Guard unificado (R3) | `industrialCoreAccess.js` |
| Deep-link `insights` / `operational_insights` | `CenterWidget.jsx` |

UI, service e rota React **não** reescritos.

## Validação

```bash
npm run test:reg002-operational-insights
```
