# AIOI — Simulation Boundary Specification

**Camada:** P14.4 — Simulation Boundary Service  
**Serviço:** `backend/src/services/aioi/aioiSimulationBoundaryService.js`  

---

## 1. Propósito

Garantir limites — simulação ≠ execução ≠ decisão ≠ autorização.

---

## 2. Regras SB-01..SB-08

| ID | Regra |
|----|-------|
| SB-01 | simulação ≠ execução |
| SB-02 | simulação ≠ decisão |
| SB-03 | simulação ≠ autorização |
| SB-04 | simulação ≠ alteração workflow |
| SB-05 | simulação ≠ alteração compliance |
| SB-06 | simulação ≠ alteração SLA |
| SB-07 | simulação ≠ alteração soberanos |
| SB-08 | simulação ≠ runtime cognitivo |

---

## 3. Função

`validateSimulationBoundaries()`

---

## 4. Token

**SIMULATION_BOUNDARIES_CERTIFIED**
