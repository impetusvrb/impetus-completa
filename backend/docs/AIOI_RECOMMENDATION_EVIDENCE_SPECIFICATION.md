# AIOI — Recommendation Evidence Specification

**Camada:** P11.3 — Recommendation Evidence Service  
**Serviço:** `backend/src/services/aioi/aioiRecommendationEvidenceService.js`  

---

## 1. Propósito

Garantir rastreabilidade completa — nenhuma recomendação sem evidência.

---

## 2. Output

```js
{ recommendation_id, evidence_chain, supporting_observations, traceability_status }
```

---

## 3. Token

**RECOMMENDATION_EVIDENCE_CERTIFIED**
