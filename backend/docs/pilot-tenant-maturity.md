# Phase Z.4 — Pilot Tenant Maturity

## Objetivo

Estabilizar o tenant piloto (Z.3) e medir maturidade antes do canal KPI.

## Métricas

| Métrica | Descrição |
|---------|-----------|
| `maturity_score` | Score composto 0–1 |
| `contextual_integrity` | Isolamento + delivery válido |
| `delivery_stability` | Oscilação + módulos shared |
| `governance_confidence` | Readiness Z.1 |
| `enforcement_safety` | Menu estável + sem underdelivery crítico |
| `kpi_channel_ready` | Sinal para próximo rollout (não activa KPI) |

## API

`GET /api/internal/pilot-maturity/{status,readiness,maturity,report}`

## Flags

| Variável | Default |
|----------|---------|
| `IMPETUS_PILOT_MATURITY_ENGINE` | off |
| `IMPETUS_PILOT_OBSERVABILITY` | on |

## Testes

```bash
npm run test:pilot-maturity
```
