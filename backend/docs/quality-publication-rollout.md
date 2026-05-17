# Quality — Rollout de publicação

- **Motor:** `backend/src/domains/quality/activation/qualityActivationRolloutEngine.js`  
- **Estágios:** shadow → pilot → canary → staged → partial → full  
- **Participação definitiva:** negada em `shadow` ou com `IMPETUS_QUALITY_PUBLICATION_SHADOW_MODE=true` (excepto lógica assistiva de API).  
- **Observabilidade:** `quality_activation_safe_check_ms`, `quality_publication_shadow_total` (telemetria backend via `enterpriseObservabilityRuntime` nas áreas novas).
