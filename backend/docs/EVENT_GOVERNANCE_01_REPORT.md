# EVENT-GOVERNANCE-01 — Relatório de Implementação

**Data:** 2026-06-20  
**Origem:** NC-02-FIX · NC-03-BRIDGE · BILLING-NOTIF-02 · NC-04-FEDERATION  
**Modo:** implementação aditiva — shadow mode (decisão sem execução)  
**Escopo:** cérebro central de governança de eventos — avaliação e políticas declarativas

---

## Resumo executivo

Implementada a camada central de **decisão** de distribuição de eventos industriais. O serviço `eventGovernanceService.evaluateEvent()` recebe um evento normalizado, aplica o catálogo declarativo de políticas e devolve canais, escalonamento e destinatários — **sem enviar, sem persistir e sem alterar produtores existentes**.

| Critério | Estado |
|----------|--------|
| `evaluateEvent()` | **Implementado** |
| Catálogo declarativo (`eventPolicyCatalog.js`) | **13 políticas** |
| Normalização de severidade | **Implementado** |
| DTO canónico de decisão | **Implementado** |
| Shadow mode (`EVENT_GOVERNANCE_ENABLED=false`) | **Default** |
| Métricas observabilidade | **4 métricas** |
| Audit endpoint | **Implementado** |
| Integração em produtores | **Não** (fase 02) |
| Execução de envios | **Não** (fase 02) |
| Migrations / workers / filas | **Não** |
| Testes | **15/15** |

```json
{
  "event_governance_01_complete": true,
  "shadow_mode_default": true,
  "evaluate_event_implemented": true,
  "policy_catalog_declarative": true,
  "severity_normalization": true,
  "governance_decision_dto": true,
  "observability_metrics": true,
  "audit_endpoint": true,
  "producers_altered": false,
  "execution_layer": false,
  "tests_passing": true,
  "safe_for_production": true
}
```

---

## Arquitectura

```text
Evento Industrial (produtor existente — inalterado)
        ↓
  [fase 02] eventGovernanceService.evaluateEvent()
        ↓
  severityNormalizer.normalizeSeverity()
        ↓
  eventPolicyCatalog → matchPolicy()
        ↓
  buildGovernanceDecisionDto()
        ↓
  Decisão { policyId, channels, escalationLevel, recipients }
        ↓
  [fase 02] execução → NC / App / Chat / Email / Dashboard
```

**Nesta fase:** apenas o bloco de decisão existe como serviço isolado. Nenhum produtor chama `evaluateEvent()` ainda.

---

## Flag de feature

| Variável | Default | Comportamento |
|----------|---------|---------------|
| `EVENT_GOVERNANCE_ENABLED=false` | **Sim** | Shadow mode — avalia e regista métricas; **zero interferência** nos fluxos produtivos |
| `EVENT_GOVERNANCE_ENABLED=true` | — | Ainda **não executa envios**; apenas marca `shadowMode: false` na resposta (preparação fase 02) |

Registada em `featureGovernanceService.js` (inventário de env vars).

---

## Artefactos criados

| Ficheiro | Função |
|----------|--------|
| `backend/src/services/eventGovernanceService.js` | `evaluateEvent()`, `matchPolicy()`, `getAuditStatus()` |
| `backend/src/governance/eventPolicyCatalog.js` | 13 políticas declarativas (billing, DSR, TPM, AI, operational, etc.) |
| `backend/src/governance/severityNormalizer.js` | `normalizeSeverity()` — PT/EN → canónico |
| `backend/src/governance/governanceDecisionDto.js` | `buildGovernanceDecisionDto()` — contrato sem persistência |
| `backend/src/tests/audit/EVENT_GOVERNANCE_01.test.js` | 15 testes |
| `backend/docs/EVENT_GOVERNANCE_01_PRODUCERS_REPORT.md` | Inventário read-only de produtores |

## Artefactos alterados (aditivos)

| Ficheiro | Alteração |
|----------|-----------|
| `backend/src/routes/audit.js` | `GET /api/audit/event-governance/status` |
| `backend/src/services/observabilityService.js` | 4 métricas governance |
| `backend/src/services/featureGovernanceService.js` | Registo `EVENT_GOVERNANCE_ENABLED` |

---

## Contratos

### Entrada — `evaluateEvent(event)`

```javascript
{
  companyId,      // obrigatório
  eventType,
  category,
  severity,
  sourceModule,
  payload
}
```

### Saída

```javascript
{
  approved: true,
  policyId: "OPERATIONAL_CRITICAL",
  channels: ["notification_center", "dashboard", "operational_alerts"],
  escalationLevel: 2,
  recipients: [{ strategy: "hierarchy_lte_2" }, ...],
  shadowMode: true,
  decision: { /* GovernanceDecisionDto */ }
}
```

### DTO canónico

```javascript
{
  eventId,
  eventType,
  category,
  severity,        // normalizado: info|low|medium|high|critical
  policyId,
  channels,
  escalationLevel,
  recipients,
  generatedAt
}
```

---

## Catálogo de políticas (13)

| ID | Categoria | Severidades | Canais principais |
|----|-----------|-------------|-------------------|
| `BILLING_EMAIL_DAY3` | billing | medium, high | email |
| `BILLING_APP_DAY5` | billing | medium, high | app_impetus |
| `BILLING_NC_DAY7` | billing | high, critical | notification_center |
| `DSR_LIFECYCLE` | dsr | medium–critical | notification_center, notifications_table |
| `MANUIA_INBOX` | manuia | low–critical | manuia_inbox |
| `TPM_CRITICAL` | tpm | high, critical | app_impetus, notification_center |
| `AI_PROACTIVE` | ai | medium–critical | app_impetus, notification_center |
| `EXECUTIVE_ALERT` | executive | high, critical | app_impetus, notification_center |
| `OPERATIONAL_CRITICAL` | operational | high, critical | notification_center, dashboard, operational_alerts |
| `OPERATIONAL_MEDIUM` | operational | medium | dashboard, operational_alerts |
| `CHAT_OPERATIONAL` | operational | low–high | notification_center, chat |
| `NC_BRIDGE_MIRROR` | system | high, critical | notification_center |
| `DEFAULT_INFO` | general | info, low | dashboard |

Matching por **especificidade** (eventTypes > sourceModules > category > severity). Política `DEFAULT_INFO` aplica-se apenas a categoria `general`, evitando catch-all silencioso para categorias desconhecidas.

---

## Normalização de severidade

| Variante existente | Canónico |
|--------------------|----------|
| baixa, low, menor | `low` |
| media, medio, warning, aviso | `medium` |
| alta, high, urgent, urgente | `high` |
| critica, critical, critico | `critical` |
| info, informational | `info` |
| desconhecido | `info` (fallback seguro) |

---

## Observabilidade

Métricas em `observabilityService`:

| Métrica | Descrição |
|---------|-----------|
| `event_governance_evaluations` | Total de chamadas a `evaluateEvent()` |
| `event_governance_policy_matches` | Eventos com política encontrada |
| `event_governance_unmatched` | Eventos sem política aplicável |
| `event_governance_shadow_decisions` | Decisões em shadow mode (flag off) |

---

## Audit endpoint

```
GET /api/audit/event-governance/status
Auth: requireAuth + requireTenantAdminRole
```

Resposta:

```json
{
  "ok": true,
  "enabled": false,
  "shadow_mode": true,
  "policies_loaded": 13,
  "evaluations": 0,
  "matches": 0,
  "unmatched": 0,
  "shadow_decisions": 0
}
```

---

## Testes

```bash
cd backend && node src/tests/audit/EVENT_GOVERNANCE_01.test.js
```

| # | Cobertura |
|---|-----------|
| T1 | Export `evaluateEvent` |
| T2 | Normalização severidade PT/EN |
| T3–T4 | Matching políticas (operational, billing) |
| T5 | DTO canónico na resposta |
| T6 | Unmatched incrementa contador |
| T7 | Shadow mode default |
| T8 | Sem persistência/envio |
| T9 | Contrato DTO |
| T10 | Métricas observabilidade |
| T11–T12 | Audit endpoint + shape |
| T13 | Catálogo declarativo isolado |
| T14–T15 | Validação companyId + tenant-safe |

**Resultado: 15 passed, 0 failed**

---

## Proibições respeitadas

- Notification Center, Billing, Chat, App Impetus, TPM, DSR, ManuIA, Operational Alerts — **inalterados**
- NC-02, NC-03, NC-04, BILLING-NOTIF-02 — **inalterados**
- Sem migrations, workers PM2, cron, tabelas, filas ou ETL
- Sem Notification Center novo ou sistema de mensagens paralelo

---

## Próxima fase — EVENT-GOVERNANCE-02

1. Integrar `evaluateEvent()` nos produtores mapeados (`EVENT_GOVERNANCE_01_PRODUCERS_REPORT.md`)
2. Camada de execução: decisão → canal correcto via serviços existentes
3. Escalonamento progressivo com `escalationLevel`
4. Rollout gradual com flag `EVENT_GOVERNANCE_ENABLED=true`

---

## Referências

- Produtores: `backend/docs/EVENT_GOVERNANCE_01_PRODUCERS_REPORT.md`
- Serviço: `backend/src/services/eventGovernanceService.js`
- Políticas: `backend/src/governance/eventPolicyCatalog.js`
