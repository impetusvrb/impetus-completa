# AIOI — Human Review Evidence Specification

**Camada:** P12.3 — Human Review Evidence Service  
**Serviço:** `backend/src/services/aioi/aioiHumanReviewEvidenceService.js`  

---

## 1. Propósito

Garantir rastreabilidade completa — nenhum pacote de revisão sem evidência.

---

## 2. Output

```js
{ assistance_id, evidence_chain, recommendation_ids, observation_ids, traceability_status }
```

---

## 3. Token

**HUMAN_REVIEW_EVIDENCE_CERTIFIED**
