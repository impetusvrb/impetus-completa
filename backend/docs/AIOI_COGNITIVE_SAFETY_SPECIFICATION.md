# AIOI — Cognitive Safety Specification

**Camada:** P9.5 — Cognitive Safety Service  
**Serviço:** `backend/src/services/aioi/aioiCognitiveSafetyService.js`  

---

## 1. Propósito

Validar restrições fundamentais de segurança cognitiva.

---

## 2. Regras CS-01..CS-08

| ID | Regra |
|----|-------|
| CS-01 | Sem auto-expansão |
| CS-02 | Sem auto-modificação |
| CS-03 | Sem alteração de soberanos |
| CS-04 | Sem alteração de workflow |
| CS-05 | Sem alteração de compliance |
| CS-06 | Sem alteração de SLA |
| CS-07 | Sem alteração de governança |
| CS-08 | Sem execução cognitiva |

---

## 3. Função

`validateSafetyInvariants()`

---

## 4. Token

**COGNITIVE_SAFETY_CERTIFIED**
