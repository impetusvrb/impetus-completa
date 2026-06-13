# AIOI — Decision Effectiveness Specification

**Camada:** P8.3 — Decision Effectiveness Analytics  
**Serviço:** `backend/src/services/aioi/aioiDecisionEffectivenessService.js`  

---

## 1. Propósito

Métricas de eficácia histórica — **estatística only**, sem inferência ou previsão.

---

## 2. Métricas

| Métrica | Descrição |
|---------|-----------|
| `success_rate` | Taxa de sucesso |
| `partial_success_rate` | Taxa de sucesso parcial |
| `failure_rate` | Taxa de falha |
| `outcome_distribution` | Distribuição por outcome_type |
| `execution_distribution` | Distribuição por execução |
| `learning_distribution` | Distribuição learning |

---

## 3. Token

**DECISION_EFFECTIVENESS_CERTIFIED**
