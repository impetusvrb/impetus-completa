# SEC-04 — Enterprise Runtime Integrity

**Fase:** SEC-04  
**Modo:** Observacional only — zero auto-remediação  
**Feature flag:** `SECURITY_RUNTIME_INTEGRITY=false` (default)

---

## Propósito

Responder **"O ambiente continua íntegro?"** comparando estado actual vs **SECURITY-BASELINE-01** certificada.

Verifica: ficheiros críticos (SHA256), PM2/processos, configuração (nginx, SSH, env), filesystem (blueprint, scripts), rede (portas, localhost-only).

---

## Activação

```bash
SECURITY_RUNTIME_INTEGRITY=true
pm2 restart impetus-backend --update-env
```

Intervalo default: 5 min (`SECURITY_INTEGRITY_CHECK_INTERVAL_MS=300000`).

---

## Endpoint

```
GET /api/audit/security-runtime-integrity
Authorization: Bearer <tenant_admin>
```

---

## Referência baseline

Evidências congeladas: `backend/docs/evidence/security-baseline-01/`

Nunca altera a baseline — apenas compara.

---

## Sequência

Observar (SEC-01) → Correlacionar (SEC-02) → Interpretar (SEC-03) → **Validar integridade (SEC-04)** → Notificar (SEC-05)
