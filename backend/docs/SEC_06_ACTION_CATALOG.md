# SEC-06 — Action Catalog

Cada entrada inclui: `recommended_response`, `risk`, `justification`, `rollback`, `operator_required`.

| ID | Level | Descrição |
|----|-------|-----------|
| observe_only | OBSERVE | Observação passiva |
| advise_review_logs | ADVISE | Rever logs nginx/SEC-01 |
| advise_integrity_check | ADVISE | Verificação manual SEC-04 |
| assist_evidence_bundle | ASSIST | Snapshot + evidências + incidente interno |
| assist_full_analysis | ASSIST | Ciclo SEC-02/03/04 + métricas |
| protect_plan_only | PROTECT | Plano Adaptativo — plan_only |

## Proibido (catálogo e executor)

kill process, restart PM2, nginx, UFW, SSH, block IP, Event Governance changes.

## Rollback

`rollbackResponse(responseId)` reverte ELEVATE_LOG_LEVEL, snapshots em memória, incidentes internos.
