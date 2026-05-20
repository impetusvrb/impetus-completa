# Fase V — Summary Governance Rollout — Implementação

## Objetivo

Segundo **rollout cognitivo real** — **SUMMARY governance**: narrativas coerentes, úteis e alinhadas a hierarquia/domínio — **shadow-first**, sem reescrita automática.

---

## Arquitetura

```
GET /dashboard/smart-summary
        │
        ▼
summaryRolloutFacade.enrichSummaryGovernanceRollout
        ├── contextualSummaryValidator / hierarchySummaryValidator
        ├── summarySemanticStabilizer + narrativeAlignmentEngine
        ├── operationalSummaryRelevance
        ├── leakage / underdelivery / authority supervisors
        └── summaryGovernanceActivationEngine
```

Coordenação Phase S: activação canal `summary` após `kpi`.

---

## Feature flags (V.11)

| Variável | Default |
|----------|---------|
| `IMPETUS_SUMMARY_GOVERNANCE_ROLLOUT` | **off** |
| `IMPETUS_SUMMARY_SEMANTIC_STABILIZATION` | **off** |
| `IMPETUS_SUMMARY_RELEVANCE_ENGINE` | **off** |
| `IMPETUS_SUMMARY_DELIVERY_PRECISION` | **off** |
| `IMPETUS_SUMMARY_GOVERNANCE_OBSERVABILITY` | **on** |
| `IMPETUS_SUMMARY_GOVERNANCE` | off (canal legacy) |

---

## API interna

Base: `/api/internal/summary-rollout`

| Método | Rota |
|--------|------|
| GET | `/status`, `/readiness`, `/relevance`, `/leakage`, `/underdelivery`, `/narrative`, `/tenants`, `/report` |
| POST | `/activate`, `/deactivate` |

**POST /activate:** `execute`, `approved_by`, readiness ≥ 0.75, KPI canal activado (ou `skip_kpi_prerequisite` em testes).

---

## Integração `GET /dashboard/smart-summary`

Blocos aditivos:

- `summary_governance`
- `summary_relevance`
- `summary_semantic_alignment` (Phase V — distinto de `semantic_alignment` runtime K)
- `summary_narrative_integrity`
- `summary_delivery_precision`

Payload legacy **inalterado** em shadow.

---

## Operação segura (V.10)

- Observação contínua  
- Recomendações apenas (`auto_correct: false`)  
- **Nunca** auto-remover ou reescrever summaries  

Eventos: `SUMMARY_LEAKAGE_DETECTED`, `SUMMARY_UNDERDELIVERY_DETECTED`, `SUMMARY_AUTHORITY_CONFLICT`, `SUMMARY_CONTEXTUAL_AMBIGUITY`, `SUMMARY_NARRATIVE_DRIFT`

---

## Deploy

```bash
npm run summary-governance:deploy:dry
npm run summary-governance:deploy
```

---

## Plano de rollout

| Etapa | Acção |
|-------|--------|
| 1 | Confirmar KPI T/U estável |
| 2 | Observabilidade V ON |
| 3 | Tenant piloto + `/readiness` |
| 4 | Activar summary + PM2 |
| 5 | Monitorizar leakage/narrative |

---

## Testes

```bash
npm run test:summary-governance-rollout
```

Snapshots: 12 personas (incl. engineering).
