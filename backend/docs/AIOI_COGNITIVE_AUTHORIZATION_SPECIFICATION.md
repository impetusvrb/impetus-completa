# AIOI — Cognitive Authorization Specification

**Camada:** P9.3 — Cognitive Authorization Service  
**Serviço:** `backend/src/services/aioi/aioiCognitiveAuthorizationService.js`  

---

## 1. Propósito

Modelo formal de autorização — P9: **todos os níveis não autorizados**.

---

## 2. Níveis

`NONE` · `OBSERVATION` · `RECOMMENDATION` · `ASSISTED_DECISION` · `RESTRICTED_EXECUTION`

Estado obrigatório P9:

```js
{ authorized: false, level: 'NONE' }
```

---

## 3. Token

**COGNITIVE_AUTHORIZATION_CERTIFIED**
