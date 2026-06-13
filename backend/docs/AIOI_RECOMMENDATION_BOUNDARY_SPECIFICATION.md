# AIOI — Recommendation Boundary Specification

**Camada:** P11.4 — Recommendation Boundary Service  
**Serviço:** `backend/src/services/aioi/aioiRecommendationBoundaryService.js`  

---

## 1. Propósito

Garantir limites cognitivos — recomendação ≠ decisão ≠ execução.

---

## 2. Regras RB-01..RB-08

| ID | Regra |
|----|-------|
| RB-01 | recomendação ≠ decisão |
| RB-02 | recomendação ≠ execução |
| RB-03 | recomendação ≠ alteração workflow |
| RB-04 | recomendação ≠ alteração compliance |
| RB-05 | recomendação ≠ alteração SLA |
| RB-06 | recomendação ≠ alteração soberanos |
| RB-07 | recomendação ≠ autorização |
| RB-08 | recomendação ≠ runtime cognitivo |

---

## 3. Função

`validateRecommendationBoundaries()`

---

## 4. Token

**RECOMMENDATION_BOUNDARIES_CERTIFIED**
