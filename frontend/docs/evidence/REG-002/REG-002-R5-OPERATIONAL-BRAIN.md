# REG-002 R5 — Operational Brain Recovery

**Fase:** REG-002

---

## Diagnóstico

`/api/dashboard/operational-brain/*` e `operationalBrainEngine` já íntegros.  
Problemas: guard mismatch + CenterWidget sem `cerebro_operacional` + widgets CC sem deep-link.

## Alterações

| Acção | Ficheiro |
|-------|----------|
| Guard unificado (R3) | `industrialCoreAccess.js` |
| Deep-link cerebro | `CenterWidget.jsx` |
| Abrir → `/app/centro-operacoes-industrial` | `WidgetDiagramaIndustrial.jsx` |
| Abrir → `/app/mapa-vazamento-financeiro` | `WidgetMapaVazamentos.jsx` |

**Engine cognitivo não alterado.**

## Validação

```bash
npm run test:reg002-operational-brain
```
