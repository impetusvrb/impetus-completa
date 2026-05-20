# Fase R — Cognitive Decision Reliability — Implementação

## Objetivo

Medir **confiabilidade operacional da decisão cognitiva**: trust, qualidade de recomendação, ambiguidade, estabilidade e supervisão humana recomendada — shadow-first, sem auto-decisão.

---

## Arquitetura

```
Canais (dashboard/me, kpis, summary, chat)
        │
        ▼
decisionReliabilityFacade
        │
        ├── cognitiveDecisionReliabilityEngine
        ├── operationalTrustEngine
        ├── recommendationQualityAnalyzer
        ├── cognitiveAmbiguityDetector
        ├── decisionStabilityEngine
        ├── humanOversightReliability
        └── reliabilityTelemetry
```

---

## Feature flags

| Variável | Default |
|----------|---------|
| `IMPETUS_DECISION_RELIABILITY` | off |
| `IMPETUS_OPERATIONAL_TRUST_ENGINE` | off |
| `IMPETUS_RECOMMENDATION_QUALITY_ANALYSIS` | off |
| `IMPETUS_DECISION_STABILITY_ENGINE` | off |
| `IMPETUS_HUMAN_OVERSIGHT_RELIABILITY` | off |
| `IMPETUS_DECISION_RELIABILITY_OBSERVABILITY` | **on** |

---

## API interna

`/api/internal/decision-reliability`:

| GET | Descrição |
|-----|-----------|
| `/status` | Flags |
| `/trust` | Operational trust |
| `/recommendations` | Quality analysis |
| `/ambiguity` | Ambiguity detection |
| `/stability` | Decision stability |
| `/supervision` | Human oversight signals |
| `/report` | Telemetria |

---

## Integração

| Rota | Bloco |
|------|--------|
| `GET /dashboard/me` | `decision_reliability` |
| `GET /dashboard/kpis` | `decision_reliability` |
| `GET /dashboard/smart-summary` | `decision_reliability` |
| `POST /dashboard/chat` | `decision_reliability` |

Payload legacy **inalterado** em shadow.

---

## Métricas

- `cognitive_decision_reliability`
- `operational_trust_score`
- `runtime_decision_confidence`
- `contextual_recommendation_quality`
- `cognitive_ambiguity_score`
- `operational_guidance_integrity`
- `runtime_decision_stability`
- `supervision_recommendation_score`

---

## Logs

- `LOW_DECISION_TRUST_DETECTED`
- `WEAK_OPERATIONAL_GUIDANCE_DETECTED`
- `CONTEXTUAL_UNCERTAINTY_DETECTED`
- `COGNITIVE_AMBIGUITY_DETECTED`
- `OPERATIONAL_UNCERTAINTY_DETECTED`
- `MULTIPLE_INTERPRETATION_CONFLICT`

---

## Testes

```bash
cd backend
npm run test:cognitive-decision-reliability
```

Snapshots: 10 cenários (incl. ambiguous, weak-guidance, low-confidence).

---

## Rollout

1. Produção: observabilidade ON.
2. Dashboard interno: `/decision-reliability/report`.
3. Piloto trust engine por tenant após baseline.

---

## Rollback

```bash
export IMPETUS_DECISION_RELIABILITY=off
export IMPETUS_OPERATIONAL_TRUST_ENGINE=off
export IMPETUS_RECOMMENDATION_QUALITY_ANALYSIS=off
export IMPETUS_DECISION_STABILITY_ENGINE=off
export IMPETUS_HUMAN_OVERSIGHT_RELIABILITY=off
export IMPETUS_DECISION_RELIABILITY_OBSERVABILITY=off
pm2 reload impetus-backend --update-env
```

Fases E→Q preservadas.

---

## Stack E→R

| Fase | Função |
|------|--------|
| E–Q | Governança, precisão, convergência, operações, estabilização, targeting, consistência |
| **R** | Confiabilidade e trust da decisão cognitiva |
