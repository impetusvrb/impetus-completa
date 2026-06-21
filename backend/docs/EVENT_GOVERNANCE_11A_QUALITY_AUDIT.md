# EVENT-GOVERNANCE-11A — Auditoria Quality

**Data:** 2026-06-20  
**Objectivo:** mapear produtores Quality antes da migração para Event Governance  
**Escopo:** distribuição de alertas/notificações apenas — workflow, CAPA, NC e indicadores inalterados

---

## Resumo

| Campo | Valor |
|-------|-------|
| Produtor central | `qualityIntelligenceService.js` → `createQualityAlert()` |
| Despacho legado | `manuiaEventDispatchService.dispatchFromQualityAlert()` |
| Tabela alertas | `quality_alerts` |
| Entrega técnica | ManuIA inbox (`manuia_inbox_notifications`) via EG-10 |
| Política Governance | `QUALITY_LIFECYCLE` |

```json
{
  "events_mapped": true,
  "notifications_identified": true,
  "migration_safe": true
}
```

---

## Arquitectura actual de distribuição

```text
detectAndCreateQualityAlerts() / rotas qualityIntelligence
    ↓
createQualityAlert() → INSERT quality_alerts
    ↓
_dispatchQualityAlert()  ← ÚNICO PONTO EG-11A
    ↓
qualityGovernanceAdapter (shadow/migrado)
    ↓
runLegacyDistribution() → dispatchFromQualityAlert()
    ↓
manuiaEventDispatchService.dispatchToMaintenanceTeam()
    ↓
manuiaInboxIngestService.ingestForUser() (EG-10)
    ↓
manuia_inbox_notifications → NC-04 Federation
```

---

## Produtores identificados

| Serviço | Função | Papel |
|---------|--------|-------|
| `qualityIntelligenceService.js` | `createQualityAlert()` | **Único ponto de distribuição Quality** |
| `qualityIntelligenceService.js` | `detectAndCreateQualityAlerts()` | Detecção automática → `createQualityAlert()` |
| `routes/qualityIntelligence.js` | Rotas HTTP | Consumidor — sem distribuição directa |

**Fora de escopo EG-11A (sem alteração):**

| Serviço | Motivo |
|---------|--------|
| `domains/quality/*` | Runtime cognitivo/rollout — sem notificação directa |
| `recordInspection` / `recordReceipt` | Persistência — sem dispatch |
| `calculateQualityIndicators` | Cálculo — sem dispatch |
| `analyzeQualityCause` | IA análise — sem dispatch |

---

## Eventos → `QUALITY_LIFECYCLE`

| Fase Governance | `alert_type` / padrões |
|-----------------|------------------------|
| `QUALITY_NON_CONFORMITY_CREATED` | defect_increase, nc_created |
| `QUALITY_NON_CONFORMITY_CRITICAL` | critical, severe |
| `QUALITY_AUDIT_DUE` | audit_due, audit_scheduled |
| `QUALITY_AUDIT_OVERDUE` | audit_overdue |
| `QUALITY_CAPA_CREATED` | capa_created, quality.capa.created |
| `QUALITY_CAPA_OVERDUE` | capa_overdue, capa.extended |
| `QUALITY_INSPECTION_FAILED` | low_conformity, inspection_failed |

Política única: **`QUALITY_LIFECYCLE`**

Canais governance: `notification_center`, `dashboard`, `chat`, `app_impetus`

---

## Destinatários

| Estratégia | Resolução |
|------------|-----------|
| `target_role_level` | Campo `quality_alerts.target_role_level` |
| Equipa manutenção | `manuiaRecipientResolverService.listMaintenanceUserIds()` |
| Fan-out | `dispatchToMaintenanceTeam()` — multi-user |

---

## Tabelas envolvidas (read-only na migração)

| Tabela | Papel |
|--------|-------|
| `quality_alerts` | Fonte de alertas Quality (INSERT inalterado) |
| `manuia_inbox_notifications` | Entrega final via ManuIA |
| `quality_inspections` | Dados — sem dispatch directo |
| `quality_indicators_snapshot` | Indicadores — sem dispatch |

---

## Integração NC-04 Federation

- Quality alertas chegam ao NC via `manuia_inbox_notifications` (fonte ManuIA)
- `quality_alerts` é lido pelo dashboard Quality — não pela federação directamente
- EG-11A **não altera** federação nem schema ManuIA

---

## Workflow / CAPA / NC (inalterados)

| Componente | EG-11A |
|------------|--------|
| Workflow CAPA | ❌ não alterado |
| Não conformidades | ❌ não alterado |
| Auditorias | ❌ não alterado |
| Inspecções | ❌ não alterado |
| Indicadores | ❌ não alterado |
| Rastreabilidade | ❌ não alterado |

---

## Riscos e mitigação

| Risco | Mitigação |
|-------|-----------|
| Perda de alerta técnico | Fallback `runLegacyDistribution()` |
| Dupla governança ManuIA+Quality | Quality governa decisão; ManuIA executa inbox (EG-10) |
| Shadow divergência | Métricas `event_governance_quality_shadow_*` |

---

## Conclusão

Migração **segura**: um único ponto (`createQualityAlert` → `_dispatchQualityAlert`), shadow default, execução legada preservada.

---

## Referências

- `backend/src/services/qualityIntelligenceService.js`
- `backend/src/services/governanceAdapters/qualityGovernanceAdapter.js`
- `backend/src/services/manuiaApp/manuiaEventDispatchService.js`
- `backend/src/governance/eventPolicyCatalog.js` → `QUALITY_LIFECYCLE`
