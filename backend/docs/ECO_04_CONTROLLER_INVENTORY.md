# ECO-04 — Inventário do Cognitive Controller

**Fase:** 4 — Auditoria pré-consumer  
**Data:** 2026-07-02  
**Base:** ADR-ECO-001 · NC-INT-001

---

## Entry points

| Entry | Ficheiro | Integrado ECO-04 |
|-------|----------|------------------|
| `handleCognitiveRequest` | `cognitiveControllerService.js` | ✅ Adapter consumer |
| `cognitiveControllerChatRolloutService` | delega a `handleCognitiveRequest` | ✅ Herdado |
| `routes/internal/environmentalCognitiveTest.js` | teste interno | ✅ Herdado |
| `routes/cognitiveCouncil.js` | `runCognitiveCouncil` directo | ⏳ Fora de scope ECO-04 |
| `routes/dashboard.js` | `runCognitiveCouncil` directo | ⏳ Fora de scope ECO-04 |

---

## Decisões paralelas (estado pré-ECO-04)

| Ponto | Tipo | Descrição |
|-------|------|-----------|
| `eventPipelineGovernanceService.runTextSensor` | Sensor | Intent/confidence sem EG v1 |
| `eventPipelineGovernanceService.evaluateGovernance` | Decisão paralela | allow/block baseado em sensor |
| `runCognitiveCouncil` → `unifiedDecisionEngine.decide` | Motor paralelo | Quando `skipRecursiveUnified` false |
| `cognitiveControllerService` | Orquestrador | Council sem `evaluatePrepareAndExecute` |

**Nota:** Controller já usa `skipRecursiveUnified: true` — UDE não invocado no path principal.

---

## Chamadas unifiedDecisionEngine

| Local | Condição |
|-------|----------|
| `cognitiveOrchestrator.js` L380-408 | `UNIFIED_DECISION_ENGINE=true` && !skipRecursiveUnified |
| Controller path | **Bloqueado** via skipRecursiveUnified |

---

## Chamadas directas IA

| Local | Função |
|-------|--------|
| `analyzePrompt` | Prompt firewall (mantido) |
| `runCognitiveCouncil` | Conselho LLM (mantido pós-decisão EG) |
| `aiProviderService.getCognitivePipelineDisclosure` | Transparência |

---

## Produtores / consumidores

| Papel | Módulo |
|-------|--------|
| **Produtor** | chat rollout, environmental test, rotas cognitivas |
| **Consumidor** | `runCognitiveCouncil`, `eventPipelineGovernanceService` (sensor) |
| **Dependências** | promptFirewall, cognitiveAttachmentIngress, aiIncidentService |

---

## Dependências críticas

```text
handleCognitiveRequest
  → promptFirewall (opcional)
  → eventPipelineGovernanceService (sensor)
  → [ECO-04] cognitiveControllerConsumerAdapter
  → runCognitiveCouncil
  → aiIncidentService (erro)
```

---

## Classificação NC-INT-001

| Campo | Valor |
|-------|-------|
| Prioridade | P2 |
| Fase | ECO-04 |
| Estratégia | Consumer (ADR-ECO-001) |
| Rollback | `ECO_CONTROLLER_VIA_EG=false` |

---

## Fluxos paralelos remanescentes (observação)

- `routes/cognitiveCouncil.js` — council API directa
- `routes/dashboard.js` — chat council dashboard
- Documentados para ECO-08 ou fase dedicada; **não alterados** em ECO-04.
