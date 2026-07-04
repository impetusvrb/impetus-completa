# SEC-13A — Enterprise Security Operational Promotion & Validation

**Módulo:** `backend/src/securityPromotionOperational/`  
**Flags:** `SECURITY_OPERATIONAL_PROMOTION=false` · `SECURITY_PROMOTION_MODE=controlled` · `SECURITY_PROMOTION_VALIDATE=true`

---

## Objectivo

Promover **SEC-01→SEC-13** para modo **ONLINE READY** — uma activação por vez, rollback independente, sem novas funcionalidades.

**Pré-requisito SEC-14** (Adaptive Blocking).

---

## Sequência obrigatória

```
SEC-01 → SEC-02 → SEC-03 → SEC-04 → SEC-05 → SEC-06 (Advise L1) → SEC-07
  → SEC-10 → SEC-11 → SEC-12 → SEC-13
```

---

## Estados por módulo

OFF · READY · ONLINE · MONITORING · DEGRADED · ROLLBACK · FAILED

---

## Endpoint

```
GET /api/audit/security-operational-promotion
```

---

## Proibido nesta fase

IP block · nginx · firewall · SSH · PM2 auto · lockdown · maintenance · Protect · Medium/High auto

**Permitido:** Observe · Advise · Assist LOW

---

## Teste

```bash
node backend/src/tests/securityPromotionOperational/SEC_13A_OPERATIONAL_PROMOTION.test.js
```

---

*Disciplina EG/ECO — operacionalizar antes de bloquear (SEC-14).*
