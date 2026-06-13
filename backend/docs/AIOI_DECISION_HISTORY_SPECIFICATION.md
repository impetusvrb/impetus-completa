# AIOI — Decision History Specification

**Camada:** P8.2 — Decision History Catalog  
**Serviço:** `backend/src/services/aioi/aioiDecisionHistoryCatalogService.js`  

---

## 1. Propósito

Consolidar histórico de decisões — **sem modificar histórico.**

---

## 2. Dimensões

| Dimensão | Descrição |
|----------|-----------|
| `decision_types` | Tipos de decisão |
| `decision_outcomes` | Outcomes por tipo |
| `execution_outcomes` | Resultados direct_action |
| `tenant_outcomes` | Resultados por tenant |
| `workflow_outcomes` | Resultados workflow |

---

## 3. Token

**DECISION_HISTORY_CERTIFIED**
