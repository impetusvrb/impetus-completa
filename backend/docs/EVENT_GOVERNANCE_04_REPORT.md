# EVENT-GOVERNANCE-04 — Relatório de Implementação (Operational Alerts)

**Data:** 2026-06-20  
**Origem:** EVENT-GOVERNANCE-01 · EG-02 · EG-03  
**Modo:** migração gradual controlada — shadow default  
**Escopo:** Operational Alerts → Event Governance (único produtor nesta fase)

---

## Resumo executivo

Iniciada a migração gradual dos produtores para a governança central. **Operational Alerts** passa a delegar a decisão de distribuição ao Event Governance via adapter dedicado, preservando persistência, bridges NC-03 e experiência do utilizador.

| Critério | Estado |
|----------|--------|
| `operationalAlertsGovernanceAdapter` | **Implementado** |
| Integração nos 3 pontos de produtor | **Implementado** |
| Shadow comparison | **Implementado** |
| Flag `EVENT_GOVERNANCE_OPERATIONAL_ALERTS=false` | **Default** |
| Audit endpoint | **Implementado** |
| Outros produtores migrados | **Não** |
| Testes | **15/15** |

```json
{
  "operational_alerts_migrated": true,
  "shadow_mode_available": true,
  "feature_flag_present": true,
  "existing_behavior_preserved": true,
  "governance_controlling_distribution": true,
  "tests_passing": true
}
```

---

## Arquitectura

### Default (shadow — flag OFF)

```text
Operational Alert INSERT (inalterado)
        ↓
_dispatchOperationalAlert()
        ↓
Adapter: evaluatePrepareAndExecute() + compareShadow()
        ↓
notificationBridge.bridgeOperationalAlert()  [fluxo actual]
```

### Migrado (flag ON)

```text
Operational Alert INSERT (inalterado)
        ↓
_dispatchOperationalAlert()
        ↓
Adapter: evaluatePrepareAndExecute() + executePlan()
        ↓
Executores (NC / Chat) — sem bridge directo
```

**Dashboard** já satisfeito pelo INSERT em `operational_alerts` — filtrado na execução.

---

## Flag

| Variável | Default | Comportamento |
|----------|---------|---------------|
| `EVENT_GOVERNANCE_OPERATIONAL_ALERTS=false` | **Sim** | Shadow + bridge legado |
| `EVENT_GOVERNANCE_OPERATIONAL_ALERTS=true` | — | Governance controla distribuição |

Execução real requer adicionalmente `EVENT_GOVERNANCE_EXECUTION_ENABLED=true`.

---

## Pontos integrados

| Função | Integração |
|--------|------------|
| `persistDecisionEngineAlerts()` | `_dispatchOperationalAlert()` após INSERT |
| `checkAndCreate()` | `_dispatchOperationalAlert()` (parada + tarefa atrasada) |
| `createPlanningDerivedAlert()` | `_dispatchOperationalAlert()` após INSERT |

Fallback silencioso para bridge NC-03 se adapter falhar.

---

## Shadow comparison

Compara legado inferido vs governance:

- severidade normalizada
- canais (com alias dashboard ↔ operational_alerts)
- escalationLevel
- policyId

Métricas:

| Métrica | Descrição |
|---------|-----------|
| `event_governance_operational_events` | Eventos avaliados |
| `event_governance_operational_migrated` | Eventos em modo migrado |
| `event_governance_operational_shadow_total` | Comparações shadow |
| `event_governance_operational_shadow_match` | Equivalência confirmada |
| `event_governance_operational_shadow_divergence` | Divergências detectadas |

---

## Audit endpoint

```
GET /api/audit/event-governance/operational-alerts
Auth: requireAuth + requireTenantAdminRole
```

```json
{
  "ok": true,
  "enabled": false,
  "shadow_mode": true,
  "events_evaluated": 0,
  "matches": 0,
  "divergences": 0,
  "migrated_events": 0,
  "shadow_total": 0
}
```

---

## Artefactos

| Ficheiro | Função |
|----------|--------|
| `governanceAdapters/operationalAlertsGovernanceAdapter.js` | Adapter + shadow + dispatch |
| `operationalAlertsService.js` | `_dispatchOperationalAlert()` nos 3 pontos |
| `notificationBridgeService.js` | Export `findSupervisorNcRecipients` |
| `EVENT_GOVERNANCE_04_OPERATIONAL.test.js` | 15 testes |

---

## Testes

```bash
cd backend && node src/tests/audit/EVENT_GOVERNANCE_04_OPERATIONAL.test.js
```

**Resultado: 15 passed, 0 failed**

---

## Próximas fases (não neste escopo)

| Fase | Produtor |
|------|----------|
| EG-05 | IA Proactiva |
| EG-06 | TPM |
| EG-07 | Executive Mode |
| EG-08 | Billing |
| EG-09 | DSR |
| EG-10 | ManuIA |

---

## Referências

- Produtores: `backend/docs/EVENT_GOVERNANCE_01_PRODUCERS_REPORT.md`
- EG-03: `backend/docs/EVENT_GOVERNANCE_03_REPORT.md`
- Adapter: `backend/src/services/governanceAdapters/operationalAlertsGovernanceAdapter.js`
