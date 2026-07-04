# ECO-05 — Pulse Consumer Adapter

**Fase:** 5 · **ADR:** ADR-ECO-002

---

## Ficheiro

`backend/src/services/governanceAdapters/pulseGovernanceConsumerAdapter.js`

---

## Fluxo

```text
Event Governance (evaluatePrepareAndExecute)
        ↓
pulseGovernanceConsumerAdapter.processPulseAnalytics
        ↓
consumeGovernanceMetrics (read-only)
        ↓
getExecutiveDashboard → Analytics → Dashboards
```

---

## API interna

| Função | Descrição |
|--------|-----------|
| `buildPulseGovernanceEvent(companyId, context)` | Normaliza snapshot analítico |
| `inferPulseParallelMetrics(context)` | Métricas Pulse próprias (shadow) |
| `consumeGovernanceMetrics(companyId, event, result)` | Read-only EG layers |
| `compareShadow(pulse, gov)` | Compara divergências |
| `processPulseAnalytics(companyId, context)` | Entry point |
| `getAuditStatus()` | Métricas adapter |

---

## Métricas consumidas (modo consumer)

| Métrica | Fonte EG (read-only) |
|---------|---------------------|
| `confidence` | governanceConfidenceService |
| `memoryScore` | governanceMemoryIntegrationService |
| `explainabilityScore` | governanceExplainabilityService audit |
| `governanceHealthScore` | governanceIntelligenceService |
| `policyEffectivenessScore` | governancePolicyOptimizationService |
| `executiveKpis` | governanceExecutiveInsightsService |

`recalculated: false` — sempre.

---

## Preservação Pulse (não decisório)

Com flag ON, permanecem **próprios**:
- `pulse_index`, `domain_states`, `cross_domain_insights`
- ingestão (`eventIngestion`), perception, temporal learning
- `GOVERNANCE` constants (assistive_only)

Injectados em `pulse_own_preserved` no consumer mode.

---

## Flag

`ECO_PULSE_VIA_EG` — `ecoPulseFlags.js`

Rollback independente de ECO-03 e ECO-04.
