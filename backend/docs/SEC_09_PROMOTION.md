# SEC-09 — Enterprise Security Promotion

**Certificação:** SEC-09 — Enterprise Security Promotion (Operational Readiness)  
**Tipo:** Plano de promoção operacional — **sem novas funcionalidades**  
**Pré-requisito:** SEC-08 ✅ ENTERPRISE SECURITY V1 — CERTIFIED WITH REMARKS  
**Execução:** 2026-07-04

---

## Decisão formal

| Resultado | **PLANO APROVADO — ACTIVAÇÃO MANUAL PENDENTE** |
|-----------|--------------------------------------------------|
| Auto-activação | **Proibida** (SEC-09 gera apenas plano) |
| Alterações de código SEC-01→07 | **Nenhuma** |
| Alterações EG / ECO / Cognitive Core / Baseline | **Nenhuma** |
| Resolução NC-SEC-08-002 | **Plano + checklist prontos** |

---

## Objectivo

Promover toda a arquitectura Enterprise Security v1 para modo operacional controlado, com:

- Activación **sequencial** (nunca simultânea)
- Rollback **independente** por módulo
- Health checks após cada etapa
- Tempo mínimo de observação entre promoções

---

## PARTE 1 — Inventário `SECURITY_*`

| Flag | Módulo | Default | Dependências | Rollback |
|------|--------|---------|--------------|----------|
| `SECURITY_OBSERVATORY` | SEC-01 | false | — | flag OFF + PM2 |
| `SECURITY_CORRELATION_ENGINE` | SEC-02 | false | SEC-01 (soft) | flag OFF + PM2 |
| `SECURITY_THREAT_INTELLIGENCE` | SEC-03 | false | SEC-02 | flag OFF + PM2 |
| `SECURITY_RUNTIME_INTEGRITY` | SEC-04 | false | — | flag OFF + PM2 |
| `SECURITY_NOTIFICATION_CENTER` | SEC-05 | false | SEC-02 | flag OFF + PM2 |
| `SECURITY_RESPONSE_ORCHESTRATOR` | SEC-06 | false | SEC-02, SEC-03 | flag OFF + PM2 |
| `SECURITY_SOC` | SEC-07 | false | SEC-01→06 | flag OFF + PM2 |

### Flags auxiliares SEC-06 (obrigatórias na promoção)

| Flag | Valor promoção fase 1 | Bloqueado |
|------|----------------------|-----------|
| `SECURITY_RESPONSE_DEFAULT_MODE` | `advise` | `assist` / `protect` inicial |
| `SECURITY_RESPONSE_MAX_LEVEL` | `1` | `2` até fase 2 |
| `SECURITY_RESPONSE_PROTECT_ENABLED` | `false` | **sempre false** |

---

## PARTE 2 — Classificação

| Classificação | Módulos |
|---------------|---------|
| **READY** | SEC-01, SEC-02, SEC-03, SEC-04 |
| **READY WITH MONITORING** | SEC-05, SEC-06 (advise L1), SEC-07 |
| **NOT ELIGIBLE** | Adapters Email/SMS/Push SEC-05 |
| **BLOCKED** | `SECURITY_RESPONSE_PROTECT_ENABLED=true`, Assist L2 até fase 2 |

---

## PARTE 3 — Sequência oficial

```
SECURITY_OBSERVATORY
        ↓  (15 min observação)
SECURITY_CORRELATION_ENGINE
        ↓  (15 min)
SECURITY_THREAT_INTELLIGENCE
        ↓  (15 min)
SECURITY_RUNTIME_INTEGRITY
        ↓  (20 min)
SECURITY_NOTIFICATION_CENTER
        ↓  (20 min)
SECURITY_RESPONSE_ORCHESTRATOR  (+ constraints advise/L1/Protect OFF)
        ↓  (30 min)
SECURITY_SOC
```

**Regra inviolável:** nunca activar tudo simultaneamente.

---

## PARTE 4 — Checkpoint por promoção

Cada etapa exige:

1. Backup `.env` (`cp .env .env.pre-sec09-step-N-*`)
2. Alterar **uma** flag principal (+ constraints SEC-06 se aplicável)
3. `pm2 restart impetus-backend --update-env`
4. Health check endpoint audit
5. Verificar logs `[SEC-0X]` sem erro fatal
6. Aguardar tempo mínimo de observação
7. Registar em `SEC_09_REPORT.md` / evidência `evidence/sec-09/`

Detalhes: [`SEC_09_RUNTIME_PROMOTION.md`](./SEC_09_RUNTIME_PROMOTION.md) · Checklist: [`SEC_09_CHECKLIST.md`](./SEC_09_CHECKLIST.md)

---

## PARTE 5 — Promotion Report (antes / durante / depois)

| Estado | Descrição |
|--------|-----------|
| **Antes** | Todas flags `SECURITY_*` = false (shadow certificado SEC-08) |
| **Durante** | Promoção sequencial — uma flag por restart |
| **Depois (alvo fase 1)** | SEC-01→05 ON · SEC-06 advise L1 · SEC-07 ON · Protect OFF |

Relatório: [`SEC_09_REPORT.md`](./SEC_09_REPORT.md)

---

## PARTE 6 — Security Promotion Dashboard

Endpoint read-only:

```
GET /api/audit/security-promotion
```

Mostra: flags activas, estado por módulo, rollback, health, latência, erros.

Implementação: `backend/src/securityPromotion/`

---

## PARTE 8 — Auto-activação

**NÃO activar automaticamente.** SEC-09 entrega apenas plano, sequência, checklist e critérios.

Script de execução manual (futuro): documentado em `SEC_09_RUNTIME_PROMOTION.md` — requer aprovação operacional explícita.

---

## Recomendação operacional imediata (pós-SEC-09)

Promover módulos **passivos** primeiro — aumentam detecção sem alterar comportamento:

| Módulo | Acção | Risco |
|--------|-------|-------|
| SEC-01 Observatory | ON | 🟢 Baixo |
| SEC-02 Correlation | ON | 🟢 Baixo |
| SEC-03 Threat Intelligence | ON | 🟢 Baixo |
| SEC-04 Runtime Integrity | ON | 🟢 Baixo |
| SEC-05 Notification Center | ON | 🟢 Baixo |
| SEC-06 Response Orchestrator | ON + advise + L1 + Protect OFF | 🟡 Monitorado |
| SEC-07 SOC Dashboard | ON | 🟡 Dependente |

---

## Critérios SEC-09

```json
{
  "promotion_plan_available": true,
  "activation_order_defined": true,
  "rollback_defined": true,
  "health_checks_defined": true,
  "security_preserved": true,
  "enterprise_baseline_preserved": true,
  "tests_passing": true
}
```

---

## Comando auditoria

```bash
node backend/src/tests/audit/SEC_09_ENTERPRISE_SECURITY_PROMOTION.test.js
```

---

*Enterprise Security v1 — promoção controlada equivalente a PROMOTION-02 (Event Governance).*
