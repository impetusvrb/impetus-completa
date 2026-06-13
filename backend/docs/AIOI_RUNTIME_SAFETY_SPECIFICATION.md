# AIOI — Runtime Safety Specification

**Camada:** P15.5 — Runtime Safety Service  
**Serviço:** `backend/src/services/aioi/aioiRuntimeSafetyService.js`  

---

## 1. Propósito

Aplicar regras de segurança — sem runtime ativo, sem cognição operacional.

---

## 2. Regras RTS-01..RTS-08

| ID | Regra |
|----|-------|
| RTS-01 | Sem runtime ativo |
| RTS-02 | Sem execução |
| RTS-03 | Sem autorização |
| RTS-04 | Sem alteração estados |
| RTS-05 | Sem alteração workflow |
| RTS-06 | Sem alteração compliance |
| RTS-07 | Sem alteração soberanos |
| RTS-08 | Sem cognição operacional |

---

## 3. Função

`validateRuntimeSafety()`

---

## 4. Token

**RUNTIME_SAFETY_CERTIFIED**
