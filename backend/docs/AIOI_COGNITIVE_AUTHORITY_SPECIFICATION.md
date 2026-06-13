# AIOI — Cognitive Authority Specification

**Camada:** P9.1 — Cognitive Authority Registry  
**Serviço:** `backend/src/services/aioi/aioiCognitiveAuthorityRegistryService.js`  

---

## 1. Propósito

Catalogar formalmente domínios observáveis, protegidos, soberanos e proibidos. **READ ONLY.**

ORG-1..5 aparecem como soberanos protegidos.

---

## 2. Outputs

| Output | Descrição |
|--------|-----------|
| `observable_domains` | Domínios apenas observáveis |
| `protected_domains` | ORG-1..5 e tokens |
| `sovereign_domains` | Soberanos oficiais |
| `forbidden_domains` | Capacidades proibidas |

---

## 3. Token

**COGNITIVE_AUTHORITY_CERTIFIED**
