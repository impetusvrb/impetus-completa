# AIOI — Decision Intelligence Specification

**Camada:** P8.1 — Decision Intelligence Service  
**Serviço:** `backend/src/services/aioi/aioiDecisionIntelligenceService.js`  

---

## 1. Propósito

Agregação executiva de histórico operacional, outcomes, compliance, riscos e SLA. **READ ONLY.**

---

## 2. Entregáveis

| Output | Descrição |
|--------|-----------|
| `operational_history` | Histórico IOE e decisões |
| `outcome_aggregation` | Catálogo de outcomes |
| `compliance_aggregation` | Scores de compliance |
| `risk_aggregation` | Riscos recorrentes |
| `sla_aggregation` | Padrões e conformidade SLA |

---

## 3. Token

**DECISION_INTELLIGENCE_CERTIFIED**
