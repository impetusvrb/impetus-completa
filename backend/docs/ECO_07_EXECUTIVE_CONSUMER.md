# ECO-07 — Executive Dashboard Consumer

**Programa:** Cognitive Ecosystem Convergence  
**Fase:** 7 — Executive Dashboards → Executive Insights  
**Data:** 2026-07-02  
**Base:** ADR-ECO-003  
**Tipo:** Certificação de implementação controlada

---

## Decisão global

**CERTIFICADO COM RESSALVAS**

| Componente | Decisão |
|------------|---------|
| Executive Dashboards (KPIs EG) | **CONSUMER READY COM RESSALVAS** |
| Domain states / Pulse index | **Permanece local** |

**Ressalva:** `ECO_EXECUTIVE_VIA_EG=false` — shadow mode. Dashboards actuais preservados; Executive Insights consultado e comparado sem impacto visual.

---

## Objectivo

Transformar dashboards executivos em **consumidores exclusivos** de Executive Insights para KPIs governados.

```text
Antes:  Dashboard → consolida KPIs paralelos (pulse proxy, strategic maturity)
Depois: Executive Insights → Adapter → Dashboard (flag ON)
```

Nunca recalcular KPIs certificados quando consumer activo.

---

## Pré-requisitos

| Marco | Estado |
|-------|--------|
| EG-20 | ✅ |
| ECO-03 … ECO-06 | ✅ |

---

## Implementação

| Artefacto | Path |
|-----------|------|
| Executive Consumer Adapter | `governanceAdapters/executiveInsightsConsumerAdapter.js` |
| Feature flags | `ecoExecutiveFlags.js` |
| Integração Pulse | `pulseCognitive/pulseCognitiveService.js` → `getExecutiveDashboard` |
| Integração Boardroom | `executiveCockpitConsolidationRuntime.js` |
| Inventário | [`ECO_07_EXECUTIVE_INVENTORY.md`](./ECO_07_EXECUTIVE_INVENTORY.md) |

---

## Modos

| Flag | Comportamento |
|------|---------------|
| `ECO_EXECUTIVE_VIA_EG=false` | Shadow — dashboard actual + EG KPIs + compare |
| `ECO_EXECUTIVE_VIA_EG=true` | Consumer — `executive_kpis` de Executive Insights |

---

## Infraestrutura preservada

Event Governance, Executive Insights core, Controller, Pulse ingestão, Knowledge Base — **sem alterações**.

APIs públicas e DTOs — **sem alterações**.

---

## NCs

| NC | Estado |
|----|--------|
| NC-INT-003 | **Fechada** (adapter; activação flag pendente) |
| NC-ECO-07-001 | Aberta — activação consumer em staging |

---

## Certificação

```bash
cd backend
node src/tests/audit/ECO_07_EXECUTIVE_CONSUMER.test.js
```

---

## Próximo passo

**ECO-08** — Certificação final do ecossistema convergido (ADR-ECO-005).

**Não activar flags** até critérios shadow staging (≥85% match, 7d estável).
