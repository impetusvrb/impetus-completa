# AIOI — Simulation Evidence Specification

**Camada:** P14.3 — Simulation Evidence Service  
**Serviço:** `backend/src/services/aioi/aioiSimulationEvidenceService.js`  

---

## 1. Propósito

Garantir que toda simulação derive de evidências reais — nenhuma simulação sem evidência.

---

## 2. Output

```js
{ simulation_id, evidence_chain, source_observations, source_recommendations, source_reviews, source_models, traceability_status }
```

---

## 3. Token

**SIMULATION_EVIDENCE_CERTIFIED**
