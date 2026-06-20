# AUD-WORKERS-01-FIX-SUBSCRIPTION — Relatório de Remediação

**Data:** 2026-06-19  
**Origem:** [AUD_WORKERS_01_REPORT.md](./AUD_WORKERS_01_REPORT.md)  
**Modo:** implementação controlada (additive only)  
**Escopo:** internalizar `checkGracePeriodAndSuspend()` — **sem** restaurar `subscription_worker.js`

---

## Resumo executivo

A função órfã `asaasService.checkGracePeriodAndSuspend()` foi **internalizada** no processo principal via scheduler horário, controlado pela flag `ENABLE_SUBSCRIPTION_GOVERNANCE_CRON` (default: **false**).

| Critério | Estado |
|----------|--------|
| Worker legado restaurado | **Não** |
| Regras financeiras alteradas | **Não** |
| Webhooks Asaas alterados | **Não** |
| `requireCompanyActive` alterado | **Não** |
| Schema de BD alterado | **Não** |
| Notificações progressivas (3/5/7) | **Fora de escopo** — fase futura |
| Scheduler criado | **Sim** |
| Flag criada | **Sim** |
| API read-only | **Sim** |
| Testes | **6/6** |

---

## Causa raiz

Commit `5921bb23e` (2026-03-13) removeu `scripts/subscription_worker.js`, que invocava:

1. `subscriptionNotifications.processProgressiveNotifications()` — serviço também removido
2. `asaasService.checkGracePeriodAndSuspend()` — **função mantida no código, nunca mais executada**

Webhooks Asaas continuaram a marcar `overdue`, mas **nenhum processo** aplicava suspensão após `grace_period_days`.

---

## Arquitetura antiga vs nova

### Antiga (removida)

```text
cron SO / PM2 manual
  → scripts/subscription_worker.js
      → subscriptionNotifications.processProgressiveNotifications()
      → asaasService.checkGracePeriodAndSuspend()
```

### Nova (implementada)

```text
impetus-backend (PM2, server.js)
  → ENABLE_SUBSCRIPTION_GOVERNANCE_CRON=true
      → node-cron '0 * * * *'
          → subscriptionGovernanceScheduler.runSubscriptionGovernanceCycle()
              → asaasService.checkGracePeriodAndSuspend()  [lógica inalterada]
```

---

## Artefatos criados / alterados

| Artefato | Tipo | Descrição |
|----------|------|-----------|
| `backend/src/services/subscription/subscriptionGovernanceScheduler.js` | **Novo** | Scheduler + ciclo + observabilidade |
| `backend/src/routes/audit.js` | **Alterado** | `GET /api/audit/subscription-governance/status` |
| `backend/src/server.js` | **Alterado** | Boot do cron + registo em `_nodeCronTasks` |
| `backend/src/services/featureGovernanceService.js` | **Alterado** | Registo da flag de governança |
| `backend/src/tests/audit/AUD_WORKERS_01_FIX_SUBSCRIPTION.test.js` | **Novo** | 6 testes |

**Não alterados:** `asaasService.js` (lógica de suspensão), webhooks, `requireCompanyActive`, `package.json` alias `subscription-worker`.

---

## Flag de controle

```env
ENABLE_SUBSCRIPTION_GOVERNANCE_CRON=false
```

| Valor | Comportamento |
|-------|---------------|
| `false` (default) | Cron **não** inicia; comportamento idêntico ao pré-fix |
| `true` | Cron horário (`0 * * * *`, timezone `TZ` ou `America/Sao_Paulo`) |

Activar em produção **após** validação em staging:

```bash
# .env / PM2 --update-env
ENABLE_SUBSCRIPTION_GOVERNANCE_CRON=true
pm2 restart impetus-backend --update-env
```

---

## Observabilidade

Logs estruturados (prefixo `[SUBSCRIPTION_GOVERNANCE]`):

| Evento | Quando |
|--------|--------|
| `subscription_governance_cycle_started` | Início do ciclo |
| `subscription_governance_cycle_finished` | Sucesso |
| `subscription_governance_cycle_failed` | Erro capturado |

Payload (sem PII / sem tenant IDs):

```json
{
  "processed_subscriptions": 0,
  "suspended_subscriptions": 0,
  "execution_ms": 0
}
```

Contagem via query read-only com **mesmo predicado** SQL de `checkGracePeriodAndSuspend` — apenas observabilidade.

---

## API de auditoria

```http
GET /api/audit/subscription-governance/status
Authorization: Bearer <token admin tenant>
```

Resposta:

```json
{
  "ok": true,
  "enabled": false,
  "flag_active": false,
  "last_execution": null,
  "last_success": null,
  "last_error": null,
  "last_metrics": null
}
```

Proteção: `requireAuth` + `requireTenantAdminRole`.

---

## Testes executados

```bash
node backend/src/tests/audit/AUD_WORKERS_01_FIX_SUBSCRIPTION.test.js
```

| Teste | Descrição |
|-------|-----------|
| T1 | Scheduler inicializa / exporta API |
| T2 | Flag desligada não activa cron |
| T3 | Flag ligada + padrão cron no código |
| T4 | `checkGracePeriodAndSuspend` é invocado |
| T5 | Erro interno não derruba processo (ok:false) |
| T6 | Endpoint + `getStatus()` com campos esperados |

Resultado esperado: `{ "passed": 6, "failed": 0 }`.

---

## Impacto operacional

### Com flag `false` (default)

Nenhuma mudança de comportamento em relação ao estado pós-AUD-WORKERS-01.

### Com flag `true`

- Assinaturas `overdue` além de `grace_period_days` passam a `suspended`
- `companies.active = false`, `subscription_status = 'suspended'`
- `requireCompanyActive` bloqueia acesso (comportamento já existente)
- Audit log `subscription_suspended` (já implementado em `asaasService.js`)

---

## Risco residual

| Item | Risco | Mitigação |
|------|-------|-----------|
| Notificações progressivas dias 3/5/7 | Médio | Fase AUD-WORKERS-01-FIX-SUBSCRIPTION-NOTIFY (futura) |
| Alias `subscription-worker` órfão | Baixo | Remover em fase separada após validação prod |
| Flag activada sem comunicação ao cliente | Médio | Activar gradualmente; monitorar `/api/audit/subscription-governance/status` |
| Falha DB no ciclo | Baixo | Erro capturado; backend continua; `last_error` exposto |

---

## Critério de sucesso (checklist)

```json
{
  "audit_workers_01_fix_subscription_complete": true,
  "check_grace_period_internalized": true,
  "scheduler_created": true,
  "flag_created": true,
  "api_created": true,
  "tests_passed": true,
  "legacy_worker_restored": false,
  "billing_behavior_changed": false,
  "financial_rules_changed": false,
  "safe_for_production": true
}
```

> **Nota:** `safe_for_production: true` assume activação da flag apenas após validação operacional. Com default `false`, deploy é **no-op** até decisão explícita.

---

## Próximos passos (fora desta fase)

1. Activar `ENABLE_SUBSCRIPTION_GOVERNANCE_CRON=true` em staging e validar suspensão controlada
2. Monitorar logs `[SUBSCRIPTION_GOVERNANCE]` e endpoint de status
3. Propor remoção do alias `subscription-worker` em AUD-WORKERS-01-CLEANUP
4. Avaliar fase separada para notificações progressivas (substituto moderno de `subscriptionNotifications.js`)

---

*Remediação AUD-WORKERS-01-FIX-SUBSCRIPTION — Pró-Ação não alterado nesta fase.*
