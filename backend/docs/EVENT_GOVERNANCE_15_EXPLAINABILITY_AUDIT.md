# EVENT-GOVERNANCE-15 — Auditoria Explainable Governance

**Data:** 2026-06-20  
**Objectivo:** mapear viabilidade da camada de explicabilidade operacional  
**Escopo:** rastreabilidade determinística — sem alterar decisões, matching ou DTOs públicos

---

## Resumo

| Campo | Valor |
|-------|-------|
| Serviço | `governanceExplainabilityService.js` |
| DTO interno | `governanceExplainabilityDto.js` |
| Trace | `decisionTrace` (interno ao pipeline) |
| Flag | `EVENT_GOVERNANCE_EXPLAINABILITY=false` (default) |

```json
{
  "decision_trace_available": true,
  "explainability_available": true
}
```

---

## Fluxo completo (EG-01 → EG-15)

```text
Evento
    ↓
Governance (match — inalterado)
    ↓
Memory (EG-14 — inalterado)
    ↓
AIOI (EG-12 — inalterado)
    ↓
Decision
    ↓
Distribution
    ↓
Learning (EG-13)
    ↓
Operational Memory (EG-14)
    ↓
Explainability (EG-15) ← rastreio determinístico
```

---

## decisionTrace (interno)

```text
event → matchedPolicies → memory → learning → aioi → decision → distribution
```

---

## Evidence Builder (factos)

| Evidência | Fonte |
|-----------|-------|
| policiesUsed | policyId matched |
| rulesTriggered | policy_match + severity |
| confidence | Learning (EG-13) |
| memoryScore | Memory (EG-14) |
| similarCasesCount | Memory lookup |
| recurrenceRate | Memory |
| historicalResolutionRate | Memory |
| aioiInsights | AIOI pipeline |
| distributionSuccess | execResult |

Sem IA generativa.

---

## explainabilityScore (0.0–1.0)

Indica **completude da explicação** — independente de `confidence` e `memoryScore`.

| Secção trace | Peso |
|--------------|------|
| event | 0.10 |
| matchedPolicies | 0.15 |
| memory | 0.15 |
| learning | 0.15 |
| decision | 0.20 |
| distribution | 0.15 |
| aioi | 0.10 |

---

## Perguntas respondidas (auditáveis)

- Por que essa política foi escolhida? → `matchedPolicies`, `rulesApplied`
- Quais evidências influenciaram? → `evidence`
- Quanto a memória pesou? → `evidence.memoryScore`, `decisionTrace.memory`
- Quanto o learning influenciou? → `decisionTrace.learning.confidence`
- Eventos semelhantes? → `decisionTrace.memory.similarCases`
- Como a confiança foi calculada? → `evidence.confidence` + factor trace

---

## Não alterado

Event Backbone, produtores, consumidores, matching, Learning, Memory, AIOI, APIs públicas, `GovernanceDecisionDto`.

---

## Observabilidade

`event_governance_explainability_hits`, `_generated`, `_errors`, `_avg_score`

---

## Audit

`GET /api/audit/event-governance/explainability`
