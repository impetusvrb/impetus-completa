# EVENT-GOVERNANCE-10 — Auditoria ManuIA

**Data:** 2026-06-20  
**Objectivo:** mapear produtores ManuIA antes da migração para Event Governance  
**Escopo:** distribuição de notificações/alertas apenas — IA, OCR, diagnósticos e motor inalterados

---

## Resumo

| Campo | Valor |
|-------|-------|
| Produtor central | `manuiaInboxIngestService.js` → `ingestForUser()` |
| Orquestrador fan-out | `manuiaEventDispatchService.js` |
| Tabela destino | `manuia_inbox_notifications` |
| Federação | NC-04 (`notificationFederationService`) |
| Política Governance | `MANUIA_INBOX` |

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
Fontes industriais (PLC, warehouse, quality, logistics, anomalies)
    ↓
manuiaEventDispatchService.dispatchToMaintenanceTeam()
    ↓
manuiaInboxIngestService.ingestForUser()  ← ÚNICO PONTO EG-10
    ↓
manuiaAppRepository.insertInboxNotification()
    ↓
manuia_inbox_notifications
    ↓
NC-04 Federation (read)
    ↓
App ManuIA + Web Push opcional (MANUIA_WEB_PUSH_ON_INGEST)
```

---

## Produtores identificados

### Ponto de integração (EG-10)

| Serviço | Função | Papel |
|---------|--------|-------|
| `manuiaInboxIngestService.js` | `ingestForUser()` | **Único ponto de distribuição** — delega ao adapter |
| `manuiaInboxIngestService.js` | `executeLegacyIngest()` | Inbox + push opcional (legado) |
| `manuiaInboxIngestService.js` | `notifyUserForWorkOrderCreated()` | OS criada → `ingestForUser()` |

### Orquestradores (inalterados — delegam a `ingestForUser`)

| Serviço | Função | Eventos |
|---------|--------|---------|
| `manuiaEventDispatchService.js` | `dispatchToMaintenanceTeam()` | Fan-out multi-técnico |
| `manuiaEventDispatchService.js` | `dispatchFromPlcAlert()` | `plc_critical`, `plc_variation` |
| `manuiaEventDispatchService.js` | `dispatchFromWarehouseAlert()` | `warehouse_*` |
| `manuiaEventDispatchService.js` | `dispatchFromLogisticsAlert()` | `logistics_*` |
| `manuiaEventDispatchService.js` | `dispatchFromQualityAlert()` | `quality_*` |
| `manuiaEventDispatchService.js` | `dispatchFromOperationalAnomaly()` | `ops_anomaly_*` |
| `manuiaEventDispatchService.js` | `notifySupervisorsOnManualEscalation()` | `manual_escalation` |

### Consumidores upstream (disparam dispatch, não distribuem directamente)

| Serviço | Trigger |
|---------|---------|
| `plcDataService.js` | Alerta PLC criado |
| `warehouseIntelligenceService.js` | Alerta almoxarifado |
| `logisticsIntelligenceService.js` | Alerta logístico |
| `qualityIntelligenceService.js` | Alerta qualidade |
| `operationalAnomalyDetectionService.js` | Anomalia operacional INSERT |
| `routes/manuiaApp.js` | Ingest manual via API |

---

## Mapeamento eventos → fases técnicas → `MANUIA_INBOX`

| Fase Governance | Exemplos eventType | Escalation |
|-----------------|-------------------|------------|
| `DIAGNOSTIC_CREATED` | diagnostic_start, diagnostic_created | 1 |
| `DIAGNOSTIC_COMPLETED` | diagnostic_completed | 1 |
| `MANUAL_ANALYZED` | manual_analyzed, manual_ocr | 1 |
| `FAILURE_PREDICTED` | failure_predicted, predictive_failure | 2 |
| `MAINTENANCE_RECOMMENDED` | maintenance_recommended | 2 |
| `CRITICAL_FAILURE` | plc_critical, machine_stopped, emergency | 3 |
| `ANOMALY_DETECTED` | ops_anomaly_*, operational_anomaly | 2 |
| `WORK_ORDER_CREATED` | work_order_created | 1 |
| `MANUAL_ESCALATION` | manual_escalation | 3 |

Política única: **`MANUIA_INBOX`**

---

## Canais actuais

| Canal | Implementação | Federação |
|-------|---------------|-----------|
| `manuia_inbox` | INSERT em `manuia_inbox_notifications` | NC-04 source |
| `web_push_optional` | `manuiaWebPushService` (flag `MANUIA_WEB_PUSH_ON_INGEST`) | Não federado |

Decisão de entrega: `manuiaAlertDecisionService.decideAlertDelivery()` (preferências, plantão, severidade).

---

## Destinatários

| Perfil | Resolução |
|--------|-----------|
| Técnico individual | `userId` explícito em `ingestForUser` |
| Equipa manutenção | `manuiaRecipientResolverService.listMaintenanceUserIds()` |
| Supervisores (escalação) | `listSupervisorMaintenanceUserIds()` |

---

## Tabelas envolvidas (read-only na migração)

| Tabela | Papel |
|--------|-------|
| `manuia_inbox_notifications` | Destino principal — inbox ManuIA |
| `manuia_user_preferences` | Preferências alertas / push |
| `manuia_on_call_schedule` | Plantão |

**Schema — não alterado.**

---

## Integração NC-04 Federation

- Fonte: `FEDERATION_SOURCES` inclui `'manuia_inbox_notifications'`
- Mapper: `mapRowToDto('manuia_inbox_notifications', row)`
- Endpoint audit: `GET /api/audit/notification-center/federation`

**Garantia EG-10:** execução governance continua via `executeLegacyIngest()` → INSERT na mesma tabela.

---

## Fora de escopo (inalterados)

| Componente | Motivo |
|------------|--------|
| `manuiaAiSummaryService` | Resumo IA para push — não é distribuição |
| `manuiaAlertDecisionService` | Regras plantão/preferências — preservadas em legacy ingest |
| `manuiaLiveAssistanceService` | Assistência live — não inbox |
| `manuals.js` / OCR / embeddings | Processamento de manuais |
| `equipmentResearchService` | Pesquisa técnica |
| Diagnósticos / MTTR / MTBF | Motor de manutenção |

---

## Flags ManuIA existentes (inalteradas)

| Variável | Papel |
|----------|-------|
| `MANUIA_EVENT_DISPATCH_ENABLED` | Master dispatch industrial |
| `MANUIA_DISPATCH_PLC` | PLC → inbox |
| `MANUIA_DISPATCH_WAREHOUSE` | Almoxarifado → inbox |
| `MANUIA_DISPATCH_LOGISTICS` | Logística → inbox |
| `MANUIA_DISPATCH_QUALITY` | Qualidade → inbox |
| `MANUIA_DISPATCH_OPERATIONAL_ANOMALY` | Anomalias → inbox |
| `MANUIA_WEB_PUSH_ON_INGEST` | Push após ingest |
| `MANUIA_ESCALATION_ON_BLOCK` | Escalação automática |

**Nova flag EG-10:** `EVENT_GOVERNANCE_MANUIA=false` (default)

---

## Riscos e mitigação

| Risco | Mitigação |
|-------|-----------|
| Federation deixa de ver ManuIA | Persistência mantida em `manuia_inbox_notifications` |
| Perda alerta técnico | Fallback obrigatório para `executeLegacyIngest` |
| Alteração motor IA/OCR | Integração só em `ingestForUser()` |
| Shadow divergência | Métricas `event_governance_manuia_shadow_*` |

---

## Conclusão de migração

A migração é **segura** porque:

1. Um único ponto de distribuição (`ingestForUser`)
2. Todos os dispatchers industriais delegam a esse ponto
3. Federação NC-04 lê `manuia_inbox_notifications` — preservada
4. Shadow mode default (`EVENT_GOVERNANCE_MANUIA=false`)

---

## Referências

- `backend/src/services/manuiaApp/manuiaInboxIngestService.js`
- `backend/src/services/manuiaApp/manuiaEventDispatchService.js`
- `backend/src/services/governanceAdapters/manuiaGovernanceAdapter.js`
- `backend/docs/NC_04_FEDERATION_REPORT.md`
- `backend/src/governance/eventPolicyCatalog.js` → `MANUIA_INBOX`
