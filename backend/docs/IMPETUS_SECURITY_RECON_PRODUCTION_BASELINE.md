# IMPETUS Security Recon — Production Baseline

**Identificador:** `IMPETUS-SEC-ANTI-RECON-BASELINE-001`  
**Go-live:** Fase 005 (`GO_LIVE_APPROVED`, 2026-07-14)  
**Baseline audit:** Fase 006  
**Runtime PM2:** `impetus-backend`, `fork_mode`, 1 instância  

---

## Flags funcionais (sem secrets)

| Flag | Valor produtivo |
|---|---|
| `SECURITY_RECON_CORRELATION` | `true` |
| `SECURITY_RECON_CONTAINMENT` | `true` (default) |
| `SECURITY_OBSERVATORY` | `true` |

Carregamento: `loadImpetusEnv()` → `backend/.env` (não versionado).

---

## Arquitetura runtime

```
REQUEST
  → PRE-AUTH: securityReconMiddleware (global, observational + canEnforcePreAuth)
  → AUTH OFICIAL DA ROTA (requireAuth | requireAdminAuth | edge gate)
  → POST-VALIDATION: runValidatedIdentityReconGuard
  → ALLOW | SUSPECT | THROTTLE | CONTAIN
  → HANDLER
```

**Entrypoint:** `/var/www/impetus-completa/backend/src/server.js`

**Pontos oficiais de validated identity:**
- `middleware/auth.js` → após `req.user` validado
- `middleware/adminPortalAuth.js` → após `req.adminUser` validado
- `securityRecon/guard/edgeIngestValidatedGate.js` → após credencial edge validada

---

## Política congelada (Fase 005/006)

### Thresholds

| Estado | Score |
|---|---|
| OBSERVE | 0–2 |
| SUSPECT | 3–5 |
| THROTTLE | 6–8 |
| CONTAIN | 9+ |

### Redutor contextual

- Identidade validada: **−3** na decisão pós-validação (`postValidationDecision.js`)
- **Nunca** bypass absoluto por `authenticated=true`

### Bounded behavior

| Parâmetro | Default |
|---|---|
| Window TTL | 120000 ms |
| Max keys | 5000 |
| Decision event cooldown | 60000 ms |
| Fail-open | sim, em excepção interna |

**SHA-256 scorePolicy.js (baseline):** `bde2d3542bd6d7ee1a848a8652b33de0b6cc44895df074940e9404c218481d45`

---

## Fingerprint reproduzível

Manifest completo com SHA-256 por ficheiro:

- `backend/docs/evidence/sec-anti-recon-006/SECURITY_RECON_RUNTIME_MANIFEST.json`
- `backend/docs/evidence/sec-anti-recon-006/runtime-manifest.json`

**Importante:** O commit `c3c20f7e7ea6dc1421c014a81e3ebc28f5a09cd7` **não** continha o Security Recon activo. O baseline Git válido é o commit isolado desta fase 006.

---

## Integrações preservadas

- **SEC-01 / Security Observatory** — eventos `ANTI_RECON_DECISION` (bounded)
- **Threat-watch** — ingest via `threatWatchSignalIngestor` (~60s)
- **Edge** — `edgeTokenCrypto.timingSafeEqualHex`, gate pós-validação
- **Nginx access log** — `/var/log/nginx/impetus-access.log` via `security/config/nginxAccessLogPath.js`

---

## Limitações conhecidas

1. **Store in-memory** — válido apenas para PM2 single-instance (`fork_mode`, instances=1).
2. **Scale-out / cluster** invalida baseline — exige estado distribuído (Redis, etc.) — **fora de scope**.
3. **Federation/SCIM** — não integrado ao guard pós-validação.
4. **Métricas OBSERVE/SUSPECT/THROTTLE/CONTAIN** — NOT_OBSERVABLE em runtime sem instrumentação adicional; decisões publicadas via SEC-01 quando limiter permite.

---

## Suites obrigatórias de regressão

```bash
node backend/scripts/sec-anti-recon-ip-equivalence.js
node backend/src/tests/securityRecon/IMPETUS_SEC_ANTI_RECON_002.test.js
node backend/src/tests/securityRecon/IMPETUS_SEC_ANTI_RECON_003.test.js
node backend/src/tests/securityRecon/IMPETUS_SEC_ANTI_RECON_004.test.js
node backend/src/tests/securityRecon/IMPETUS_SEC_ANTI_RECON_BASELINE_001.test.js
node backend/src/tests/securityObservatory/SEC_01_OBSERVATORY_AUDIT.test.js
```

---

## Rollback

```bash
# backend/.env
SECURITY_RECON_CORRELATION=false

pm2 restart impetus-backend --update-env
```

Repetir health + login + boot /app. Preservar logs/evidências.

---

## Governança futura

Qualquer alteração em `scorePolicy`, thresholds, guards, identity context, catalog, TTL, max keys ou `decisionEventLimiter` **exige**:

1. Execução de `IMPETUS_SEC_ANTI_RECON_BASELINE_001`
2. Prova fake Authorization / XFF spoof / boot /app / admin / edge
3. Prova handler suppression (THROTTLE/CONTAIN)
4. Actualização deste documento se comportamento mudar

Mudança de PM2 para cluster **invalida** premissa do store in-memory.

---

## Risco operacional: disco

No go-live/baseline: ~96% uso em `/`. Maior consumidor: PostgreSQL (~49G). PM2 logs ~383M com rotação (`/etc/logrotate.d/impetus-pm2`, 14 dias, maxsize 50M). SEC-RECON não persiste SQL por request.

**Classificação:** `OPERATIONAL_STORAGE_RISK_ELEVATED` (não crítico imediato para SEC-RECON, mas requer plano de capacidade separado).
