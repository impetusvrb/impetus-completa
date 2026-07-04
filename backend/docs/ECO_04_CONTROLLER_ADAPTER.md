# ECO-04 — Controller Consumer Adapter

**Fase:** 4 · **ADR:** ADR-ECO-001

---

## Ficheiro

`backend/src/services/governanceAdapters/cognitiveControllerConsumerAdapter.js`

---

## API interna

| Função | Descrição |
|--------|-----------|
| `buildControllerGovernanceEvent(input)` | Normaliza pedido → GovernanceEvent |
| `inferParallelDecision(input)` | Decisão paralela actual (pipeline sensor) |
| `compareShadow(parallel, governanceResult)` | Compara shadow vs EG |
| `consumeCognitiveLayers(event, governanceResult)` | Read-only Learning/Memory/Explainability/Intelligence |
| `processControllerRequest(input)` | Entry point shadow/consumer |
| `getAuditStatus()` | Métricas adapter |

---

## Fluxo alvo

```text
handleCognitiveRequest
      ↓
processControllerRequest
      ↓
buildControllerGovernanceEvent
      ↓
evaluatePrepareAndExecute (EG v1 — inalterado)
      ↓
[shadow] compareShadow + council legacy
[consumer] consumeCognitiveLayers → council se approved | block se denied
```

---

## Mapeamento de políticas (existentes)

| Módulo Controller | Política EG |
|-------------------|-------------|
| `cognitive_council` (default) | `AI_PROACTIVE` (sourceModule: proactiveAI) |
| `environmental` | `OPERATIONAL_*` via operationalRealtimeCoordinator |

**Sem regras novas** — catálogo inalterado.

---

## Consumer context (modo ON)

Injectado em `councilData.contextual_data.event_governance_consumer`:

- `decisionContext` — decisão EG (não recalculada)
- `learning` — últimos records read-only
- `memory` — buildMemoryContext
- `explainability` — buildExplanation
- `intelligence` — buildImprovementReport (resumo)

`recalculated: false` em todos os paths consumer.

---

## Bloqueio (deny)

```json
{
  "ok": false,
  "error": {
    "code": "GOVERNANCE_DENIED",
    "stage": "governance_consumer"
  }
}
```

Council **não** invocado.

---

## Flag

`ECO_CONTROLLER_VIA_EG` — serviço `ecoControllerFlags.js`

Rollback independente de ECO-03.
