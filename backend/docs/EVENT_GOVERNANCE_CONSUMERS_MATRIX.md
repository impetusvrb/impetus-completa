# EVENT GOVERNANCE — Matriz de Consumidores

**Certificação:** INTEG-01  
**Baseline:** Event Governance v1 (EG-20 certificado)  
**Data:** 2026-07-02  
**Tipo:** Inventário read-only — sem alterações ao EG

---

## Legenda

| Símbolo | Significado |
|---------|-------------|
| ✅ | Integrado via adapter EG |
| ⚠️ | Integração parcial / shadow / bypass documentado |
| ❌ | Sem integração directa com Event Governance |
| 📋 | Política no catálogo sem produtor wired |

---

## Matriz principal — Produtores activos

| Módulo | Adapter | EG | Política(s) | Eventos produzidos | Canais | Flag migração | Estado |
|--------|---------|-----|-------------|-------------------|--------|---------------|--------|
| `operationalAlertsService` | `operationalAlertsGovernanceAdapter` | 04 | `OPERATIONAL_CRITICAL`, `OPERATIONAL_MEDIUM` | `operational_*` | NC, dashboard, operational_alerts | `EVENT_GOVERNANCE_OPERATIONAL_ALERTS` | ⚠️ shadow default |
| `aiProactiveMessagingService` / `proactiveAI` | `aiProactiveGovernanceAdapter` | 05 | `AI_PROACTIVE` | `failure_pattern`, `proactive_*` | app_impetus, NC | `EVENT_GOVERNANCE_AI_PROACTIVE` | ⚠️ shadow default |
| `tpmNotifications` | `tpmGovernanceAdapter` | 06 | `TPM_CRITICAL` | `tpm_incident`, `tpm_*` | app_impetus, NC | `EVENT_GOVERNANCE_TPM` | ⚠️ shadow default |
| `executiveMode` | `executiveGovernanceAdapter` | 07 | `EXECUTIVE_ALERT` | `executive_response` | app_impetus, NC | `EVENT_GOVERNANCE_EXECUTIVE` | ⚠️ shadow default |
| `subscriptionBillingNotificationService` | `billingGovernanceAdapter` | 08 | `BILLING_*` (3) | `subscription_notification_day*` | email, app, NC | `EVENT_GOVERNANCE_BILLING` | ⚠️ shadow default |
| `dsrNotificationService` | `dsrGovernanceAdapter` | 09 | `DSR_LIFECYCLE` | `dsr_*` | NC, notifications_table | `EVENT_GOVERNANCE_DSR` | ⚠️ shadow default |
| `manuiaInboxIngestService` | `manuiaGovernanceAdapter` | 10 | `MANUIA_INBOX` | fases técnicas ManuIA | manuia_inbox, web_push | `EVENT_GOVERNANCE_MANUIA` | ⚠️ shadow default |
| `qualityIntelligenceService` | `qualityGovernanceAdapter` | 11A | `QUALITY_LIFECYCLE` | `quality_*` | NC, dashboard, chat, app | `EVENT_GOVERNANCE_QUALITY` | ⚠️ shadow default |
| `sstNotificationService` | `sstGovernanceAdapter` | 11B | `SST_LIFECYCLE` | `sst_*`, `safety_*` | NC, dashboard, chat, app | `EVENT_GOVERNANCE_SST` | ⚠️ shadow default |
| `esgNotificationService` | `esgGovernanceAdapter` | 11C | `ESG_LIFECYCLE` | `esg_*`, `environment_*` | NC, dashboard, chat, app | `EVENT_GOVERNANCE_ESG` | ⚠️ shadow default |
| `aioiGovernanceIntegrationService` | `aioiGovernanceAdapter` | 12 | `AIOI_INSIGHT` | `aioi_insight_*` | NC, dashboard, chat, app | `EVENT_GOVERNANCE_AIOI` | ⚠️ observe-only |

---

## Roteamento especial — operationalAlertsService

| Prioridade | Destino | Condição |
|------------|---------|----------|
| 1 | `esgNotificationService` | Alerta ESG |
| 2 | `sstNotificationService` | Alerta SST |
| 3 | `operationalAlertsGovernanceAdapter` | Demais alertas |

---

## Módulos IMPETUS — integração indirecta ou ausente

| Módulo | Relação | Estado |
|--------|---------|--------|
| Manu IA | `manuiaInboxIngestService` → EG-10 | ✅ |
| Chat Impetus | Canal executor; `operationalActionExecutor` bypass | ⚠️ NC-INT-004 |
| ANAM | Sem EG | ❌ |
| Dashboard Executivo | Canal + UI runtime paralela | ⚠️ |
| Executive Boardroom | `executiveMode` → EG-07 | ✅ |
| Gêmeo Digital | Sem EG | ❌ |
| Pulse | Governança interna Pulse | ❌ NC-INT-006 |
| Workflow | Sem adapter | ❌ |
| Registro Inteligente | Sem EG | ❌ |
| Biblioteca Técnica | Sem EG | ❌ |
| Cognitive Controller | Sem EG | ❌ NC-INT-001 |
| Conversation Context | Sem EG | ❌ |
| Event Backbone | Domínio separado | ❌ NC-INT-002 |
| Frontend | Sem `/api/audit/event-governance/*` | ❌ NC-INT-003 |

---

## Políticas — cobertura (17 total)

14 com adapter activo · 3 sem wiring dedicado (`CHAT_OPERATIONAL`, `NC_BRIDGE_MIRROR`, `DEFAULT_INFO`)
