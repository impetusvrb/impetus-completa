# SEC-16 — Enterprise Threat Deception Framework

**Módulo:** `backend/src/securityThreatDeception/`  
**Feature flag:** `SECURITY_THREAT_DECEPTION=false` (default)  
**Modo:** `SECURITY_DECEPTION_MODE=observe`  
**Tipo:** Planos certificados — **nenhum honeypot exposto**

---

## Missão

Criar ambiente controlado de **decepção estratégica** que:

- Aumente confiança na classificação de scanners
- Reduza eficácia da enumeração (planos)
- Produza inteligência adicional para SEC-02, SEC-03 e SEC-14
- **Nunca exponha ativos reais**

---

## Flags

```env
SECURITY_THREAT_DECEPTION=false
SECURITY_DECEPTION_MODE=observe
SECURITY_DECEPTION_REQUIRE_APPROVAL=true
SECURITY_THREAT_DECEPTION_EVAL_MS=60000
```

---

## Endpoint

```
GET /api/audit/security-threat-deception
```

---

## DTO `threat_deception_v1`

| Campo | Descrição |
|-------|-----------|
| `deceptionStatus` | INACTIVE, PLANNING, CANDIDATE, READY |
| `deceptionConfidence` | 0–1 |
| `engagementLevel` | NONE, LOW, MEDIUM, HIGH |
| `fakeResourceRecommended` | Perfil honeypot recomendado |
| `evidenceGain` | Ganho estimado de evidências |
| `recommendedScenario` | Cenário principal |
| `approvalRequired` | Sempre `true` por defeito |

---

## Proibições

- Criar honeypots reais · alterar respostas HTTP · nginx · firewall · PM2
- Expor recursos falsos ao público · alterar Event Governance · ECO

---

## Teste

```bash
node backend/src/tests/securityThreatDeception/SEC_16_THREAT_DECEPTION.test.js
```

---

*Transição para decepção estratégica — modo 100% consultivo nesta fase.*
