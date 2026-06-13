# AIOI — Cognitive Simulation Specification

**Camada:** P14.1 — Cognitive Simulation Service  
**Serviço:** `backend/src/services/aioi/aioiCognitiveSimulationService.js`  

---

## 1. Propósito

Simular cenários hipotéticos sobre artefactos certificados — **sem efeitos operacionais reais**.

Simulações: auditáveis, reproduzíveis, rastreáveis, reversíveis, isoladas.

---

## 2. Base permitida

P10 Observation · P11 Recommendation · P12 Human Review · P13 Authorization Modeling

---

## 3. Output

```js
{ simulation_id, category, scenario_description, simulated_inputs, simulated_outcomes, simulation_scope, generated_at }
```

`simulation_scope`: `ISOLATED_HYPOTHETICAL`

---

## 4. Token

**COGNITIVE_SIMULATION_CERTIFIED**
