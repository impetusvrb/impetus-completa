# AIOI — Human Review Safety Specification

**Camada:** P12.5 — Human Review Safety Service  
**Serviço:** `backend/src/services/aioi/aioiHumanReviewSafetyService.js`  

---

## 1. Propósito

Aplicar regras de segurança — sem auto-execução, sem auto-decisão.

---

## 2. Regras HRS-01..HRS-08

| ID | Regra |
|----|-------|
| HRS-01 | Sem auto-execução |
| HRS-02 | Sem auto-aprovação |
| HRS-03 | Sem auto-decisão |
| HRS-04 | Sem alteração estados |
| HRS-05 | Sem alteração workflow |
| HRS-06 | Sem alteração compliance |
| HRS-07 | Sem alteração soberanos |
| HRS-08 | Sem runtime cognitivo |

---

## 3. Função

`validateHumanReviewSafety()`

---

## 4. Token

**HUMAN_REVIEW_SAFETY_CERTIFIED**
