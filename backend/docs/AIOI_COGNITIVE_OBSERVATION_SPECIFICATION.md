# AIOI — Cognitive Observation Specification

**Camada:** P10.1 — Cognitive Observation Service  
**Serviço:** `backend/src/services/aioi/aioiCognitiveObservationService.js`  

---

## 1. Propósito

Gerar observações estruturadas — agregação observacional only, sem interpretação livre.

---

## 2. Domínios observados

| Categoria | Fonte |
|-----------|-------|
| throughput | Evidência operacional |
| SLA | SLA compliance |
| risk | Risk register |
| compliance | Compliance analytics |
| decision | Decision intelligence |
| capacity | Tenant capacity |

---

## 3. Output

```js
{ observation_id, category, source_domains, observation_text, evidence_sources, generated_at }
```

---

## 4. Token

**COGNITIVE_OBSERVATION_CERTIFIED**
