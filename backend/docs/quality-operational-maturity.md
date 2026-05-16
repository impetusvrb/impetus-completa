# Maturidade operacional (rollout)

## Motor

`qualityOperationalMaturityScoring.js` — score 0–1 ponderado sobre métricas declaradas (`workflow_completion_rate`, `telemetry_coverage`, etc.).

## Níveis

`INITIAL` → `BASIC` → `STRUCTURED` → `CONTROLLED` → `OPTIMIZED` → `COGNITIVE_READY`.

## Evento

`quality.rollout.maturity_changed` (com publicação opcional).
