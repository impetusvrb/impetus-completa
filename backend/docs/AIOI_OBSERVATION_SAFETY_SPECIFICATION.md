# AIOI — Observation Safety Specification

**Camada:** P10.5 — Observation Safety Service  
**Serviço:** `backend/src/services/aioi/aioiObservationSafetyService.js`  

---

## 1. Propósito

Garantir que observações não se transformem em recomendações ou ações.

---

## 2. Regras OS-01..OS-08

| ID | Regra |
|----|-------|
| OS-01 | Sem sugestão de ação |
| OS-02 | Sem priorização automática |
| OS-03 | Sem recomendação executiva |
| OS-04 | Sem previsão |
| OS-05 | Sem inferência |
| OS-06 | Sem alteração operacional |
| OS-07 | Sem autorização cognitiva |
| OS-08 | Sem execução cognitiva |

---

## 3. Função

`validateObservationSafety()`

---

## 4. Token

**OBSERVATION_SAFETY_CERTIFIED**
