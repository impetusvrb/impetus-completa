# EVENT-GOVERNANCE-13 — Auditoria Learning Layer

**Data:** 2026-06-20  
**Objectivo:** mapear viabilidade da camada de aprendizagem operacional  
**Escopo:** feedback e confidence apenas — produtores, executores e canais inalterados

---

## Resumo

| Campo | Valor |
|-------|-------|
| Feedback DTO | `governanceFeedbackDto.js` |
| Learning | `governanceLearningService.js` |
| Confidence | `governanceConfidenceService.js` |
| AIOI Learning | `aioiLearningService.js` |
| Flag | `EVENT_GOVERNANCE_LEARNING=false` (default) |

```json
{
  "learning_layer_possible": true,
  "governance_events_available": true
}
```

---

## Insights e eventos disponíveis (EG-12)

| Fonte | Dados |
|-------|-------|
| `aioiGovernanceFeedService` | Eventos governados normalizados |
| `aioiGovernanceAdapter` | Insights gerados, shadow metrics |
| `governanceLearningIntegrationService` | Outcomes pós-execução |

---

## Políticas activas (EG-01 → EG-11C + AIOI)

`BILLING_*`, `DSR_LIFECYCLE`, `MANUIA_INBOX`, `QUALITY_LIFECYCLE`, `SST_LIFECYCLE`, `ESG_LIFECYCLE`, `AIOI_INSIGHT`, `TPM_CRITICAL`, `AI_PROACTIVE`, `EXECUTIVE_ALERT`, `OPERATIONAL_*`

---

## Métricas existentes reutilizadas

| Métrica | Uso EG-13 |
|---------|-----------|
| `event_governance_*` | Baseline avaliações |
| `event_governance_aioi_insights` | Insights para aprendizagem |
| `event_governance_learning_*` | Nova camada |
| `event_governance_confidence_updates` | Ajustes de score |

---

## Fluxo FASE 4

```text
Evento → Governance → AIOI → Insight → Distribuição
    ↓ execResult
governanceLearningIntegrationService
    ↓ recordOutcome / recordEscalation*
governanceLearningService (memória)
    ↓
governanceConfidenceService.computeConfidenceScore
    ↓
GovernanceDecisionDto.confidence (enriquecimento)
```

---

## Funções de aprendizagem

| Função | Propósito |
|--------|-----------|
| `recordOutcome()` | Resultado da execução |
| `recordResolution()` | Problema resolvido |
| `recordFalsePositive()` | Insight/alerta falso |
| `recordEscalationSuccess()` | Escalonamento eficaz |
| `recordEscalationFailure()` | Escalonamento ineficaz |

---

## AIOI Learning

| Input | Signal |
|-------|--------|
| Insight confirmado | ↑ confidence |
| Insight ignorado | ↓ confidence (false positive) |
| Insight resolvido | ↑ confidence (resolution) |

Sem geração de notificações.

---

## Shadow mode

`EVENT_GOVERNANCE_LEARNING=false`: observações em buffer shadow; DTO mantém confidence baseline (0.5); matching inalterado.

---

## Não alterado

Produtores EG-04–EG-11C, executores, federation, Notification Center, políticas existentes (matching).
