# EVENT-GOVERNANCE-12 — Auditoria AIOI

**Data:** 2026-06-20  
**Objectivo:** mapear integração AIOI como consumidora do barramento Event Governance  
**Escopo:** camada cognitiva apenas — produtores, canais, NC e federation inalterados

---

## Resumo

| Campo | Valor |
|-------|-------|
| Feed | `aioiGovernanceFeedService.getGovernedEvents()` |
| Integração | `aioiGovernanceIntegrationService.onGovernedEvent()` |
| Correlação | `aioiCorrelationService.detectCorrelations()` |
| Insights | `aioiInsightService.generateInsights()` |
| Política saída | `AIOI_INSIGHT` |
| Flag | `EVENT_GOVERNANCE_AIOI=false` (default — observação only) |

```json
{
  "governed_events_available": true,
  "aioi_integration_safe": true
}
```

---

## Eventos normalizados disponíveis (EG-01 → EG-11C)

| Política | Categoria | Produtor |
|----------|-----------|----------|
| `OPERATIONAL_*` | operational | operationalAlertsService |
| `AI_PROACTIVE` | ai | aiProactiveMessagingService |
| `TPM_CRITICAL` | tpm | tpmNotifications |
| `EXECUTIVE_ALERT` | executive | executiveMode |
| `BILLING_*` | billing | subscriptionBillingNotificationService |
| `DSR_LIFECYCLE` | dsr | dsrNotificationService |
| `MANUIA_INBOX` | manuia | manuiaInboxIngestService |
| `QUALITY_LIFECYCLE` | quality | qualityIntelligenceService |
| `SST_LIFECYCLE` | sst | sstNotificationService |
| `ESG_LIFECYCLE` | esg | esgNotificationService |

---

## Severidades normalizadas

`info`, `low`, `medium`, `high`, `critical` — via `severityNormalizer`

---

## Escalation levels

0–4 (payload dinâmico SST/ESG; políticas com default 1–3)

---

## Canais governados

| Canal | Políticas |
|-------|-----------|
| `notification_center` | Operational, Quality, SST, ESG, AIOI, Billing NC |
| `dashboard` | Quality, SST, ESG, AIOI |
| `chat` | Quality, SST, ESG, AIOI |
| `app_impetus` | Quality, SST, ESG, AIOI, Billing, Executive |
| `manuia_inbox` | ManuIA |
| `email` | Billing day3 |

---

## Arquitectura EG-12

```text
Produtor (inalterado)
    ↓
Event Governance (evaluate + execute)
    ↓ recordGovernedEvent
aioiGovernanceFeedService
    ↓ getGovernedEvents
aioiCorrelationService
    ↓
aioiInsightService
    ↓ insight governado
aioiGovernanceAdapter.dispatchAioiInsight
    ↓
Event Governance (AIOI_INSIGHT)
    ↓
Executores → Canais (Governance decide)
```

---

## Correlações suportadas

| Tipo | Descrição |
|------|-----------|
| `repetition` | Mesmo eventType ≥ 3 vezes |
| `recurrence` | Mesma policyId ≥ 2 vezes |
| `trend` | Severidade crescente |
| `escalating` | Escalation level crescente |
| `anomaly` | Critical/high isolado entre médios |
| `cross_domain` | TPM+Quality, SST+ESG, Operational+ManuIA, Billing+Executive |

---

## Tipos de insight

`INSIGHT_OPERATIONAL`, `INSIGHT_QUALITY`, `INSIGHT_SAFETY`, `INSIGHT_ESG`, `INSIGHT_FINANCIAL`, `INSIGHT_EXECUTIVE`

---

## Guardas de segurança

| Guarda | Implementação |
|--------|---------------|
| Loop AIOI | `_isAioiProducedEvent()` ignora category `aioi` |
| Produtores | Nenhum adapter EG-04..11C alterado |
| Envio directo AIOI | `runLegacyDistribution()` → observe_only |
| Flag OFF | `evaluateAndPrepare` apenas (sem execute) |

---

## Não alterado

Notification Center, NC-04 Federation, executores, produtores EG-04–EG-11C, billing workflow, DSR, ManuIA, Quality, SST, ESG, TPM, Executive.

---

## Preparação Fase 3 (Cognição)

Com EG-12, AIOI consome um fluxo único normalizado — alinhado com visão de inteligência operacional centralizada do Impetus.
