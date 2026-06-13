# AIOI — Decision Maturity Specification

**Camada:** P8.5 — Decision Maturity Service  
**Serviço:** `backend/src/services/aioi/aioiDecisionMaturityService.js`  

---

## 1. Propósito

Indicadores de maturidade de inteligência de decisão executiva. **READ ONLY.**

---

## 2. Indicadores

| Indicador | Descrição |
|-----------|-----------|
| `decision_coverage` | Cobertura de decisões sobre IOE |
| `decision_consistency` | Coerência entre dimensões |
| `decision_traceability` | Rastreabilidade via catálogo/audit |
| `decision_quality` | Qualidade baseada em eficácia |
| `decision_maturity_score` | Score agregado 0–100 |

---

## 3. Token

**DECISION_MATURITY_CERTIFIED**
