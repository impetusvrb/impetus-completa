# Z.M1 — Maintenance Telemetry Strategy

**Data:** 2026-05-23

## Fontes (prioridade)

1. **CMMS / OS** — ordens abertas, MTTR, backlog
2. **Produção (proxy)** — `downtime_proxy`, `maintenance_open` via `productionSignalLoader`
3. **IIoT (opcional)** — predictive failure quando sensores disponíveis
4. **Cadastro estrutural** — ativos críticos, preventiva vencida

## Regras

| Regra | Implementação |
|-------|----------------|
| Nunca inventar MTBF | empty state honesto |
| Stale detection | reutilizar padrão environmental telemetry |
| Trust score | `maintenanceTrustScore` (futuro) |
| Adaptive weighting | Z.28 `adaptiveSignalWeighting` por domínio maintenance |

## Sinais mínimos para cockpit native

```json
{
  "telemetry_readiness": "ready|partial|empty",
  "operational": {
    "mtbf_hours": null,
    "mttr_hours": null,
    "open_orders": 0,
    "critical_assets": 0,
    "preventive_overdue": 0,
    "predictive_risk": "unknown"
  }
}
```

## Orchestration futura

- Fadiga: excesso alertas OS + heatmap
- Usefulness: binding ratio engine bridge ≥0.75
- Convergência: downtime ↔ produção (supervised, internal)

Sem implementação nesta fase.
