# AIOI — Recommendation Safety Specification

**Camada:** P11.5 — Recommendation Safety Service  
**Serviço:** `backend/src/services/aioi/aioiRecommendationSafetyService.js`  

---

## 1. Propósito

Aplicar regras de segurança — sem auto-execução, sem auto-aprovação.

---

## 2. Regras RS-01..RS-08

| ID | Regra |
|----|-------|
| RS-01 | Sem auto-execução |
| RS-02 | Sem auto-aprovação |
| RS-03 | Sem auto-escalação |
| RS-04 | Sem auto-modificação |
| RS-05 | Sem alteração de estados |
| RS-06 | Sem alteração de decisões |
| RS-07 | Sem alteração de soberanos |
| RS-08 | Sem execução cognitiva |

---

## 3. Função

`validateRecommendationSafety()`

---

## 4. Token

**RECOMMENDATION_SAFETY_CERTIFIED**
