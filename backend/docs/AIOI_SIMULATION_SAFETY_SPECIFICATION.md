# AIOI — Simulation Safety Specification

**Camada:** P14.5 — Simulation Safety Service  
**Serviço:** `backend/src/services/aioi/aioiSimulationSafetyService.js`  

---

## 1. Propósito

Aplicar regras de segurança — sem execução real, sem alteração de estado.

---

## 2. Regras SS-01..SS-08

| ID | Regra |
|----|-------|
| SS-01 | Sem execução real |
| SS-02 | Sem alteração de estado |
| SS-03 | Sem alteração workflow |
| SS-04 | Sem alteração compliance |
| SS-05 | Sem alteração SLA |
| SS-06 | Sem alteração soberanos |
| SS-07 | Sem autorização operacional |
| SS-08 | Sem runtime cognitivo |

---

## 3. Função

`validateSimulationSafety()`

---

## 4. Token

**SIMULATION_SAFETY_CERTIFIED**
