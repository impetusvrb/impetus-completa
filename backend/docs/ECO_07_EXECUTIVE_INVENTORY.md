# ECO-07 — Inventário Dashboards Executivos (PARTE 1)

**Fase:** 7 · **Data:** 2026-07-02 · **Base:** ADR-ECO-003 · **NC:** NC-INT-003

---

## Dashboards inventariados

| Dashboard | Entry | Consumidor |
|-----------|-------|------------|
| Pulse Executive | `pulseCognitive/executiveDashboard.js` → `getExecutiveDashboard` | API `/pulse-cognitive/hr/executive` |
| Boardroom Z.27 | `executiveCockpitConsolidationRuntime.js` | Cognitive runtime / dashboard |
| Cognitive Pulse | `cognitivePulseService.buildCognitivePulse` | Dashboard vivo operacional |
| Enterprise Pilot | `enterprisePilotRolloutOrchestrator.buildExecutiveDashboard` | Pilot rollout prep |
| AIOI Cockpit | `aioiExecutiveCockpitReadModelService` | `/api/aioi/executive-cockpit/*` |
| Frontend Boardroom | `dashboardContextAdapter.js` (Z.27) | UI executiva |

---

## KPIs EG certificados (Executive Insights)

| KPI | Fonte oficial |
|-----|---------------|
| Governance Maturity Index | `governanceExecutiveInsightsService.computeExecutiveKpis` |
| Operational Stability Index | idem |
| Policy Efficiency Index | idem |
| Continuous Improvement Index | idem |
| Governance Evolution Trend | idem |

---

## Classificação

| Item | Classificação |
|------|---------------|
| Pulse domain_states / cross_domain | **Permanece local** |
| Pulse pulse_index | **Permanece local** |
| KPIs EG (5 acima) | **Passa a consumir Executive Insights** |
| ECO-05 governance_analytics | **Complementar** (métricas EG evaluate) |
| Cognitive Pulse global_efficiency | **Permanece local** (operacional) |
| Enterprise Pilot rollout_health | **Legado** (piloto, não EG) |
| AIOI maturity/cockpit scores | **Permanece local** (domínio AIOI) |

---

## Consolidações duplicadas (pré-ECO-07)

| Dashboard | Duplicação | Acção ECO-07 |
|-----------|------------|--------------|
| Pulse Executive | Proxies pulse_index → maturity | Shadow compare + consumer |
| Boardroom Z.27 | strategic.maturity paralelo | Shadow compare + consumer |
| pulseGovernanceConsumer (ECO-05) | executiveKpis via EG | Mantido; ECO-07 unifica KPIs dashboard |

---

## Integrações ECO-07

```text
pulseCognitiveService.getExecutiveDashboard
  → executiveInsightsConsumerAdapter.processExecutiveDashboard (dashboardId: pulse_executive)

executiveCockpitConsolidationRuntime.applyExecutiveBoardroomConsolidation
  → executiveInsightsConsumerAdapter.processExecutiveDashboard (dashboardId: boardroom_z27)
```

---

## Dependências

```text
executiveInsightsConsumerAdapter
  → governanceExecutiveInsightsService (buildExecutiveDashboard, read-only)
  → ecoExecutiveFlags (ECO_EXECUTIVE_VIA_EG)
```
