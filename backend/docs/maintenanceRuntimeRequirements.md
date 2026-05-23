# Z.M1 — Maintenance Runtime Requirements

**Data:** 2026-05-23

## Runtime canónico (futuro)

```
backend/src/cognitiveRuntime/domains/maintenance/
├── bridge/          # maintenanceSignalLoader, engineBridge
├── cockpit/         # consolidator, centers
├── runtime/         # density, consolidation, semantic
├── telemetry/       # asset health, predictive signals
├── governance/      # PCM isolation
├── liveValidation/  # espelhar Z.P1 / P1.1
└── observability/
```

## Requisitos funcionais

1. **MTBF/MTTR** — KPIs reais ou empty state honesto
2. **Downtime correlation** — interna com produção, sem leakage visual
3. **Predictive failure** — só quando telemetria disponível
4. **Density** — ≤6 centros, ≤8 widgets (registry Z.24)
5. **Isolamento** — sem RH/ESG/executivo granular
6. **Flags** — shadow-first, PM2 reload only

## Telemetria mínima

| Sinal | Fonte |
|-------|-------|
| OS abertas | CMMS / produção proxy |
| MTTR/MTBF | KPIs dashboard / histórico |
| Ativos críticos | Cadastro estrutural |
| Preventiva vencida | Schedule CMMS |
| Paradas | productionSignalLoader.downtime_proxy |

## Maturity delta esperado

| Estado | Score |
|--------|-------|
| Pós-Z.27 | ~91% |
| Pós-Z.M1 | ~94% |

## Não implementar nesta fase

Somente requisitos — implementação em Z.M1.
