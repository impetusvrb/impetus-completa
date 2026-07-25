# REG-002 — Dead Click Matrix

**Fonte:** `frontend/src/platform/audit/regression/reg002DeadClickMatrix.js`

---

## Critério de cadeia completa

```
UI → Route → Render → API → Backend → Service
```

## Itens críticos (4)

| ID | Path | Backend | Service | Recovery |
|----|------|---------|---------|----------|
| mapa_vazamentos | `/app/mapa-vazamento-financeiro` | `/financial-leakage` | financialLeakageDetectorService | R1 |
| mapa_industrial | `/app/centro-operacoes-industrial` | `/industrial` | industrialOperationalMapService | R2 |
| operational_insights | `/app/insights` | `/insights` | personalizedInsightsService | R4 |
| cerebro_operacional | `/app/cerebro-operacional` | `/operational-brain` | operationalBrainEngine | R5 |

## Dead clicks resolvidos

| ID | Antes | Depois |
|----|-------|--------|
| kpi_industrial_orphan | `/app/industrial` | `/app/centro-operacoes-industrial` |
| center_widget_cerebro_insights | `path=#` | ROUTES mapeados |
| guard_menu_route_divergence | Layout ≠ App | política única |

## Certificação automatizada de navegabilidade

`npm run test:reg002-navigation` + `test:reg002-http200` percorrem o catálogo crítico, validam ficheiros, mounts e deep-links — mecanismo permanente anti-regressão para evoluções futuras (ex.: Logística).
