# AIOI — Cognitive Recommendation Specification

**Camada:** P11.1 — Cognitive Recommendation Service  
**Serviço:** `backend/src/services/aioi/aioiCognitiveRecommendationService.js`  

---

## 1. Propósito

Transformar observações P10 em recomendações estruturadas — **artefacto analítico only**.

A recomendação NÃO é decisão, NÃO produz execução, NÃO altera estados.

---

## 2. Base permitida

P6 Assurance · P7 Knowledge · P8 Intelligence · P9 Governance · P10 Observation

---

## 3. Output

```js
{ recommendation_id, category, recommendation_text, supporting_observations, evidence_chain, confidence_level, generated_at }
```

`confidence_level`: `LOW` | `MEDIUM` | `HIGH` — baseado em evidências only.

---

## 4. Token

**COGNITIVE_RECOMMENDATION_CERTIFIED**
