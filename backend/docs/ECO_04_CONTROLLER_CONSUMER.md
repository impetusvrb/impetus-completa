# ECO-04 — Cognitive Controller Consumer

**Programa:** Cognitive Ecosystem Convergence  
**Fase:** 4 — Controller Consumer  
**Data:** 2026-07-02  
**Base:** ADR-ECO-001  
**Tipo:** Certificação de implementação controlada

---

## Decisão global

**CERTIFICADO COM RESSALVAS**

| Componente | Decisão |
|------------|---------|
| Cognitive Controller (`handleCognitiveRequest`) | **CONSUMER READY COM RESSALVAS** |
| Entry points paralelos (cognitiveCouncil, dashboard) | Observação — fora de scope |

**Ressalva:** `ECO_CONTROLLER_VIA_EG=false` — shadow mode activo. Controller continua executando; EG consultado e comparado. Activação consumer requer critérios ECO-03 em staging (≥85% shadow match, 7d estável) **antes** de `ECO_CONTROLLER_VIA_EG=true`.

---

## Objectivo

Transformar o Cognitive Controller em **consumidor** do Event Governance v1, eliminando gradualmente actuação como motor paralelo de decisão.

```text
Evento normalizado → Event Governance v1 → Controller Consumer → runCognitiveCouncil (se allow)
```

---

## Pré-requisitos

| Marco | Estado |
|-------|--------|
| ECO-02 contrato | ✅ |
| ECO-03 bypasses | ✅ Certificado com ressalvas (shadow) |
| Event Governance v1 | ✅ Congelado |

---

## Implementação

| Artefacto | Path |
|-----------|------|
| Controller Consumer Adapter | `governanceAdapters/cognitiveControllerConsumerAdapter.js` |
| Feature flags | `ecoControllerFlags.js` |
| Integração | `cognitiveControllerService.js` |
| Inventário | [`ECO_04_CONTROLLER_INVENTORY.md`](./ECO_04_CONTROLLER_INVENTORY.md) |

---

## Modos

| Flag | Modo | Comportamento |
|------|------|---------------|
| `ECO_CONTROLLER_VIA_EG=false` | Shadow | Council actual + EG evaluate + compare divergências |
| `ECO_CONTROLLER_VIA_EG=true` | Consumer | EG decide; council só se approved; layers consumidas |

---

## Infraestrutura preservada

Event Governance v1, Learning, Memory, Explainability, Intelligence, Knowledge Base, Executive Insights, Event Backbone — **sem alterações**.

APIs públicas e DTOs — **sem alterações**.

---

## NCs

| NC | Estado |
|----|--------|
| NC-INT-001 | **Fechada** (adapter; activação flag pendente) |
| NC-ECO-04-001 | Aberta — activação consumer em staging |

---

## Certificação

```bash
cd backend
node src/tests/audit/ECO_04_CONTROLLER_CONSUMER.test.js
```

---

## Próximo passo

**ECO-05** — Pulse Consumer (ADR-ECO-002), após estabilidade shadow ECO-03/04 em staging.

**Não activar flags ECO-03/04 em produção** até critérios de maturidade validados.
