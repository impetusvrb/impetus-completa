# SEC-09 — Promotion Report

**Gerado:** 2026-07-04  
**Decisão:** PLANO APROVADO — ACTIVAÇÃO MANUAL PENDENTE  
**Referência:** NC-SEC-08-002 resolvida por plano operacional

---

## Antes (estado actual certificado)

| Componente | Flag | Estado |
|------------|------|--------|
| SEC-01 Observatory | `SECURITY_OBSERVATORY` | OFF |
| SEC-02 Correlation | `SECURITY_CORRELATION_ENGINE` | OFF |
| SEC-03 Threat Intelligence | `SECURITY_THREAT_INTELLIGENCE` | OFF |
| SEC-04 Runtime Integrity | `SECURITY_RUNTIME_INTEGRITY` | OFF |
| SEC-05 Notification | `SECURITY_NOTIFICATION_CENTER` | OFF |
| SEC-06 Response | `SECURITY_RESPONSE_ORCHESTRATOR` | OFF |
| SEC-07 SOC | `SECURITY_SOC` | OFF |
| Protect | `SECURITY_RESPONSE_PROTECT_ENABLED` | OFF (bloqueado) |

**Certificação:** SEC-08 — 139/139 testes · Operational Readiness verificado em certificação  
**Risco:** Detecção limitada — arquitectura certificada mas shadow

---

## Durante (procedimento planeado)

| # | Etapa | Flag | Restart | Health | Observação |
|---|-------|------|---------|--------|------------|
| 1 | SEC-01 | `SECURITY_OBSERVATORY=true` | PM2 | `/security-observatory` | 15 min |
| 2 | SEC-02 | `SECURITY_CORRELATION_ENGINE=true` | PM2 | `/security-incidents` | 15 min |
| 3 | SEC-03 | `SECURITY_THREAT_INTELLIGENCE=true` | PM2 | `/security-threat-intelligence` | 15 min |
| 4 | SEC-04 | `SECURITY_RUNTIME_INTEGRITY=true` | PM2 | `/security-runtime-integrity` | 20 min |
| 5 | SEC-05 | `SECURITY_NOTIFICATION_CENTER=true` | PM2 | `/security-notifications` | 20 min |
| 6 | SEC-06 | `SECURITY_RESPONSE_ORCHESTRATOR=true` + constraints | PM2 | `/security-response` | 30 min |
| 7 | SEC-07 | `SECURITY_SOC=true` | PM2 | `/security-soc` | 15 min |

**Rollbacks executados:** nenhum (plano apenas)  
**Auto-activação:** desactivada

---

## Depois (alvo fase 1 — recomendação operacional)

| Componente | Antes | Depois (alvo) | Modo |
|------------|-------|---------------|------|
| SEC-01 | OFF | **ON** | Observacional |
| SEC-02 | OFF | **ON** | Read-only |
| SEC-03 | OFF | **ON** | Consultivo |
| SEC-04 | OFF | **ON** | Observacional |
| SEC-05 | OFF | **ON** | Notificação only |
| SEC-06 | OFF | **ON** | advise L1 |
| SEC-07 | OFF | **ON** | Dashboard read-only |
| Protect | OFF | **OFF** | Bloqueado |

**Benefício:** Detecção, correlação, inteligência, integridade, notificação e orientação activas — sem acções destructivas automáticas.

---

## NCs

| ID | Estado pós-SEC-09 |
|----|-------------------|
| NC-SEC-08-002 | **Plano disponível** — activação manual pendente |
| NC-SEC-08-001 | Permanece até flags ON em produção |
| NC-SEC-08-003 | Permanece — adapters v2 |

---

## Comandos

```bash
node backend/src/tests/audit/SEC_09_ENTERPRISE_SECURITY_PROMOTION.test.js
curl -H "Authorization: Bearer $TOKEN" /api/audit/security-promotion
```

Evidências: `backend/docs/evidence/sec-09/`
