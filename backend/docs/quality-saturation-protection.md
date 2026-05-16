# Saturation protection (rollout)

## Motor

`qualityUserSaturationProtection.js` — limites declarativos `insights_per_hour`, `alerts_per_hour`, `cognitive_interaction_rate`.

## Comportamento assistivo

Batching, digest executivo, cooldown cognitivo sugerido — **supressão de recomendações** é opt-in via política de UI/cliente.

## Eventos

`quality.rollout.saturation_detected`, `quality.rollout.recommendation_suppressed` (publicação opcional).

## Métrica

`quality_saturation_runtime_ms`.
