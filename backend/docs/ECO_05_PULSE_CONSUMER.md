# ECO-05 — Pulse Consumer

**Programa:** Cognitive Ecosystem Convergence  
**Fase:** 5 — Pulse Consumer  
**Data:** 2026-07-02  
**Base:** ADR-ECO-002  
**Tipo:** Certificação de implementação controlada

---

## Decisão global

**CERTIFICADO COM RESSALVAS**

| Componente | Decisão |
|------------|---------|
| Pulse Executive Analytics | **CONSUMER READY COM RESSALVAS** |
| Ingestão industrial / pulse_index | **Permanece próprio** (camada analítica apenas) |

**Ressalva:** `ECO_PULSE_VIA_EG=false` — shadow mode. Pulse continua calculando índices próprios; EG consultado e comparado sem alterar UX.

---

## Objectivo

Transformar o Pulse em **consumidor analítico** do Event Governance — não decisório.

```text
Antes:  Pulse → calcula → interpreta → resume
Depois: Event Governance → Pulse → consome → agrega → apresenta
```

Pulse **não recalcula** confidence, memoryScore, explainabilityScore, governanceHealthScore, policyEffectivenessScore nem Executive KPIs quando flag ON.

---

## Pré-requisitos

| Marco | Estado |
|-------|--------|
| EG-20 | ✅ |
| PROMOTION-02 | ✅ |
| ECO-03 | ✅ |
| ECO-04 | ✅ |

---

## Implementação

| Artefacto | Path |
|-----------|------|
| Pulse Consumer Adapter | `governanceAdapters/pulseGovernanceConsumerAdapter.js` |
| Feature flags | `ecoPulseFlags.js` |
| Integração | `pulseCognitive/pulseCognitiveService.js` → `getExecutiveDashboard` |
| Inventário | [`ECO_05_PULSE_INVENTORY.md`](./ECO_05_PULSE_INVENTORY.md) |

---

## Modos

| Flag | Comportamento |
|------|---------------|
| `ECO_PULSE_VIA_EG=false` | Shadow — Pulse actual + EG evaluate + compare |
| `ECO_PULSE_VIA_EG=true` | Consumer — métricas EG em `governance_analytics`; pulse_index/domain_states preservados |

---

## Infraestrutura preservada

Event Governance, Controller, Executive Insights, Knowledge Base, Event Backbone, Learning, Memory, Explainability — **sem alterações**.

APIs públicas e DTOs — **sem alterações**.

---

## NCs

| NC | Estado |
|----|--------|
| NC-INT-006 | **Fechada** (adapter; activação flag pendente) |
| NC-ECO-05-001 | Aberta — activação consumer em staging |

---

## Certificação

```bash
cd backend
node src/tests/audit/ECO_05_PULSE_CONSUMER.test.js
```

---

## Próximo passo

**ECO-06** — Conversation Context + Knowledge Base (ADR-ECO-004).

**Não activar flags** até critérios ECO-03/04 staging (≥85% shadow, 7d estável).
