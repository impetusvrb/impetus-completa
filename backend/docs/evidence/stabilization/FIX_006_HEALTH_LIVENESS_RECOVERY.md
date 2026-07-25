# FIX-006 — Health Liveness / Integrations Probe Separation

**Data:** 2026-07-13  
**Missão:** FIX-006 — `/health` lento por probe de integrações  
**Classificação:** PERFORMANCE

---

## Critérios de aceite

```
FIX_006_STATUS              = PASS
ROOT_CAUSE_IDENTIFIED       = YES
ARCHITECTURE_PRESERVED      = YES
RBAC_PRESERVED              = YES
NEW_API_CONTRACT_BREAK      = 0
FORENSIC_EVIDENCE_PRESERVED = TRUE
```

---

## Root cause

```
ROOT_CAUSE_FILE      = backend/src/server.js
ROOT_CAUSE_SYMBOL    = app.get('/health') + allowHealthDetails()
ROOT_CAUSE_MECHANISM = Em pedidos loopback (PM2, curl local, monitoring interno),
                       allowHealthDetails=true dispara Promise.all([
                         voiceHealthProbe(),      // TTS OpenAI síncrono
                         getAiIntegrationsHealth() // 4 probes HTTP externos (timeout 6-12s cada)
                       ]) no path de liveness
REGRESSION_ORIGIN      = KNOWN (design original — detalhe no mesmo endpoint)
```

---

## Patch mínimo

| Alteração | Detalhe |
|-----------|---------|
| `/health`, `/api/health` | Sempre liveness rápido — `{ success, status, service }` |
| `/health/integrations`, `/api/health/integrations` | Probes completos — gated `allowHealthDetails` |
| Whitelists | `globalRateLimit`, `licenseEnforcement`, `tenantIsolationGuard` |

**Compatibilidade:** Callers que precisam de `integrations` em loopback migram para `/health/integrations` (mesmo gate de detalhe).

---

## Medição pós-patch (2026-07-13)

| Endpoint | Antes | Depois |
|----------|-------|--------|
| `GET /health` (loopback) | **23.5s** | **0.003s** |
| `GET /health/integrations` | N/A | ~2.7s (probes — endpoint dedicado) |
| `GET /api/system/health/deep` | ~10–37ms | **0.006s** |

---

## FALSE_NORMAL_STATE

Pré-fix: processo online mas health check lento → LB/monitoring interpreta como down.

Pós-fix: liveness distingue **processo vivo** vs **integrações externas**.

---

## Ficheiros alterados

| Ficheiro |
|----------|
| `backend/src/server.js` |
| `backend/src/middleware/globalRateLimit.js` |
| `backend/src/middleware/licenseEnforcement.js` |
| `backend/src/middleware/tenantIsolationGuard.js` |

---

## Deploy

- Build frontend: **Não**
- PM2 restart: **`impetus-backend` apenas**
- `pm2 restart all`: **Não**

---

*Evidência gerada sem alteração à cadeia forense P0.*
