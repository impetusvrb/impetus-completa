# SST — Relatório de Observabilidade Enterprise (Validação)

**Integração:** `enterpriseObservabilityRuntime` via `safetyOperationalValidationOrchestrator.recordValidationMetrics`

---

## Métricas registadas

| Métrica | Fonte |
|---------|--------|
| `safety_rollout_readiness_score` | pilot readiness |
| `safety_cognitive_pressure` | cognitive analyzer |
| `safety_publication_resolution_ms` | behavior aggregates |
| `safety_audience_validation_failures` | audience validation |
| `safety_navigation_runtime_ms` | frontend `safetyOperationalTelemetry.js` |
| `safety_operational_density` | telemetria client |
| `safety_menu_injected_total` | publication merge |
| `safety_publication_failures_total` | guards |

---

## Frontend telemetry (aditivo)

Ficheiro: `frontend/src/observability/safetyOperationalTelemetry.js`

Funções: `noteSafetyNavigationResolutionMs`, `noteSafetyCognitivePressure`, `noteSafetyRolloutReadiness`, `getSafetyOperationalTelemetrySnapshot`.

---

## Restrições respeitadas

- **Não** alterado `enterpriseObservabilityRuntime` core.
- **Não** alterado industrial backbone.
- Métricas em try/catch — falha de observability não quebra validação.

---

## API health

`GET /api/safety-operational-validation/health` → `{ assistive_only: true }`

---

## Decisão

Observabilidade **activa** para fase de validação.  
Usar dashboards existentes + pilot dashboard para correlacionar denied routes e cognitive pressure durante shadow.

**Rollout:** manter SHADOW; observar 48h antes de PILOT condicional.
