# AIOI — Authorization Boundary Specification

**Camada:** P13.4 — Authorization Boundary Service  
**Serviço:** `backend/src/services/aioi/aioiAuthorizationBoundaryService.js`  

---

## 1. Propósito

Garantir limites — modelagem ≠ autorização ≠ execução.

---

## 2. Regras AB-01..AB-08

| ID | Regra |
|----|-------|
| AB-01 | modelagem ≠ autorização |
| AB-02 | modelagem ≠ decisão |
| AB-03 | modelagem ≠ execução |
| AB-04 | modelagem ≠ alteração workflow |
| AB-05 | modelagem ≠ alteração compliance |
| AB-06 | modelagem ≠ alteração SLA |
| AB-07 | modelagem ≠ alteração soberanos |
| AB-08 | modelagem ≠ runtime cognitivo |

---

## 3. Função

`validateAuthorizationBoundaries()`

---

## 4. Token

**AUTHORIZATION_BOUNDARIES_CERTIFIED**
