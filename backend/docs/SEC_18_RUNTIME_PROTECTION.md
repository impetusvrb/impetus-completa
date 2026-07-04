# SEC-18 — Enterprise Adaptive Runtime Protection

**Módulo:** `backend/src/securityRuntimeProtection/`  
**Feature flag:** `SECURITY_RUNTIME_PROTECTION=false` (default)  
**Modo:** `SECURITY_RUNTIME_PROTECTION_MODE=observe`  
**Tipo:** Controlador consultivo — **nenhuma execução automática**

---

## Missão

Orquestrador certificado que decide **quando, como e qual perfil** de protecção aplicar, consolidando SEC-02→SEC-17 em perfis operacionais graduados.

---

## Flags

```env
SECURITY_RUNTIME_PROTECTION=false
SECURITY_RUNTIME_PROTECTION_MODE=observe
SECURITY_RUNTIME_REQUIRE_APPROVAL=true
```

---

## Endpoint

```
GET /api/audit/security-runtime-protection
```

---

## DTO `runtime_protection_v1`

| Campo | Descrição |
|-------|-----------|
| `protectionStatus` | Estado operacional agregado |
| `currentProfile` | Perfil actual (default NORMAL) |
| `recommendedProfile` | Perfil recomendado |
| `runtimeRiskScore` | Risco runtime 0–1 |
| `protectionUrgency` | Urgência de protecção |
| `approvalStatus` | single/dual/pending/expired/revoked |
| `rollbackAvailable` | Sempre true nesta fase |
| `executionEligible` | Sempre false nesta fase |
| `recommendedActions` | Planos com `auto_execute: false` |

---

## Teste

```bash
node backend/src/tests/securityRuntimeProtection/SEC_18_RUNTIME_PROTECTION.test.js
```

---

*Runtime Protection Controller — decisão certificada antes de contenção activa.*
