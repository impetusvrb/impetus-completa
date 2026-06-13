# AIOI — Human Decision Assistance Specification

**Camada:** P12.1 — Human Decision Assistance Service  
**Serviço:** `backend/src/services/aioi/aioiHumanDecisionAssistanceService.js`  

---

## 1. Propósito

Consolidar observações P10, recomendações P11, evidências, compliance, SLA e riscos em pacotes de revisão humana — **Human-In-The-Loop only**.

Toda decisão continua exclusivamente humana.

---

## 2. Base permitida

P6 Assurance · P7 Knowledge · P8 Intelligence · P9 Governance · P10 Observation · P11 Recommendation

---

## 3. Output

```js
{ assistance_id, category, observations, recommendations, evidence_chain, review_required, generated_at }
```

`review_required`: **sempre** `true`.

---

## 4. Token

**HUMAN_DECISION_ASSISTANCE_CERTIFIED**
