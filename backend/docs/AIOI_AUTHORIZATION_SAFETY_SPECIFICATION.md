# AIOI — Authorization Safety Specification

**Camada:** P13.5 — Authorization Safety Service  
**Serviço:** `backend/src/services/aioi/aioiAuthorizationSafetyService.js`  

---

## 1. Propósito

Aplicar regras de segurança — sem auto-autorização, sem auto-execução.

---

## 2. Regras AS-01..AS-08

| ID | Regra |
|----|-------|
| AS-01 | Sem auto-autorização |
| AS-02 | Sem auto-execução |
| AS-03 | Sem auto-decisão |
| AS-04 | Sem alteração estados |
| AS-05 | Sem alteração workflow |
| AS-06 | Sem alteração compliance |
| AS-07 | Sem alteração soberanos |
| AS-08 | Sem runtime cognitivo |

---

## 3. Função

`validateAuthorizationSafety()`

---

## 4. Token

**AUTHORIZATION_SAFETY_CERTIFIED**
