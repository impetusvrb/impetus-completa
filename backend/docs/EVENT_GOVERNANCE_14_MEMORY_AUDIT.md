# EVENT-GOVERNANCE-14 — Auditoria Memória Operacional

**Data:** 2026-06-20  
**Objectivo:** mapear viabilidade da memória operacional governada  
**Escopo:** consulta e enriquecimento contextual — sem alterar matching, produtores ou DTOs públicos

---

## Resumo

| Campo | Valor |
|-------|-------|
| Memória | `governanceOperationalMemoryService.js` |
| Lookup | `governanceMemoryIntegrationService.js` |
| Memory Score | `governanceMemoryScoreService.js` |
| Flag | `EVENT_GOVERNANCE_MEMORY=false` (default) |

```json
{
  "operational_memory_available": true,
  "governance_events_available": true
}
```

---

## Pré-requisitos satisfeitos

| Fase | Estado |
|------|--------|
| EG-01 → EG-13 | Concluídos |
| Learning + Confidence | `governanceLearningService`, `governanceConfidenceService` |
| Feed AIOI | `aioiGovernanceFeedService` |

---

## Eventos e políticas disponíveis para indexação

Todas as políticas EG-01 → EG-11C + `AIOI_INSIGHT` — metadados: tipo, categoria, severidade, policyId, sourceModule, contexto operacional (equipamento, setor, tags, origem).

---

## Arquitectura FASE 5

```text
Evento
    ↓
Governance (match policy — inalterado)
    ↓
Memory Lookup (flag ON)
    ↓ decisionContext.memory
AIOI (inalterado)
    ↓
Distribuição / Execução
    ↓
Learning (EG-13 — inalterado)
    ↓
Operational Memory (registo consolidado)
```

---

## Similaridade (determinística)

| Critério | Peso |
|----------|------|
| Mesmo eventType | +4 |
| Mesma category | +2 |
| Mesma policyId | +2 |
| Mesmo equipment | +2 |
| Mesma severity | +1 |
| Mesmo sourceModule | +1 |
| Tags coincidentes | +1 cada |
| Reincidência | +0.5 |

Sem IA generativa.

---

## decisionContext.memory (interno)

| Campo | Descrição |
|-------|-----------|
| `similarCases` | Ocorrências semelhantes |
| `historicalConfidence` | Média confidence histórico |
| `recurrenceRate` | Taxa de reincidência |
| `averageResolutionTime` | Tempo médio resolução (ms) |
| `falsePositiveRate` | Taxa falsos positivos |
| `historicalResolutionRate` | Taxa resolução |
| `relatedPolicies` | Políticas relacionadas |
| `memoryScore` | Score 0.0–1.0 (independente de confidence) |

Nunca altera decisão automaticamente.

---

## Separação Learning vs Memory

| Serviço | Papel |
|---------|-------|
| `governanceLearningService` | Aprendizado (feedback, outcomes) |
| `governanceOperationalMemoryService` | Organiza conhecimento, similaridade, padrões |

---

## Não alterado

Event Backbone, produtores, consumidores, matching, AIOI, Pulse, Controller Cognitivo, APIs públicas, `GovernanceDecisionDto` (sem campo memory — apenas `decisionContext` interno na evaluation).

---

## Observabilidade

`event_governance_memory_lookups`, `_hits`, `_misses`, `_stored`, `_patterns`, `_score_computed`

---

## Audit

`GET /api/audit/event-governance/memory`
