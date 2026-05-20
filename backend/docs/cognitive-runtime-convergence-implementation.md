# Fase M — Cognitive Runtime Convergence — Implementação

## Objetivo

Convergir o runtime cognitivo do IMPETUS para **uma única verdade contextual governada**, eliminando fragmentação entre canais (dashboard, KPI, summary, insight, IA) — em modo **shadow-first**, preservando E→L.

---

## Arquitetura

```
Dashboard / KPI / Summary
        │
        ▼
cognitiveConvergenceFacade
        │
        ├── unifiedCognitiveContextEngine
        │     ├── contextualTruthAuthority → runtimeTruthState
        │     ├── governedContextComposition
        │     ├── unifiedSemanticAssembly
        │     └── runtimeTruthResolver
        ├── unifiedKpiTruthResolver / unifiedSummaryTruthResolver / unifiedInsightResolver
        ├── governedAiOrchestrator + unifiedInferencePipeline
        ├── contextCompositionGraph + cognitiveDependencyGraph
        ├── cognitiveConsistencyValidator + convergenceIntegrityValidator
        ├── contextDriftDetector + semanticDriftTracker
        ├── unifiedExplainabilityResolver + runtimeDecisionTrace
        └── cognitiveConvergenceTelemetry
```

---

## Single source of truth

- **Authority:** `contextualTruthAuthority` + `governedTruthRegistry`
- **State:** `runtimeTruthState` (chave user+tenant+axis)
- **Consumo:** todos os canais leem `runtime_truth_state` quando observabilidade ou flags ON

---

## Feature flags

| Variável | Default |
|----------|---------|
| `IMPETUS_UNIFIED_COGNITIVE_CONTEXT` | off |
| `IMPETUS_RUNTIME_TRUTH_AUTHORITY` | off |
| `IMPETUS_GOVERNED_AI_ORCHESTRATION` | off |
| `IMPETUS_COGNITIVE_CONSISTENCY_VALIDATION` | off |
| `IMPETUS_CONTEXT_DRIFT_DETECTION` | off |
| `IMPETUS_COGNITIVE_CONVERGENCE_OBSERVABILITY` | **on** |

---

## API interna

Montada em `/api/internal/cognitive-convergence` (auth + ACL governance):

| GET | Path |
|-----|------|
| `/status` | Estado e flags |
| `/truth-state` | `runtime_truth_state` resolvido |
| `/consistency` | Validação cognitiva |
| `/drift` | Drift contextual/semântico |
| `/fragmentation` | Grafo + fragmentação |
| `/dependencies` | Grafo de dependências |
| `/report` | Relatório completo + decision trace |

---

## Integração dashboard

| Rota | Bloco JSON |
|------|------------|
| `GET /dashboard/me` | `cognitive_convergence` |
| `GET /dashboard/kpis` | `cognitive_convergence` (kpi_truth) |
| `GET /dashboard/smart-summary` | `cognitive_convergence` (summary_truth) |

Payload legacy **inalterado** em shadow; `runtime_truth_state` no body só com `IMPETUS_UNIFIED_COGNITIVE_CONTEXT=on`.

---

## Métricas

- `convergence_rate`, `truth_integrity`, `contextual_unification_score`
- `cognitive_fragmentation_rate`, `summary_consistency_rate`, `insight_consistency_rate`
- `runtime_truth_confidence`, `semantic_convergence_health`
- `cognitive_consistency_score`, `convergence_confidence`

---

## Logs estruturados

- `CONTEXT_DRIFT_DETECTED`
- `SEMANTIC_TRUTH_DEVIATION`
- `COGNITIVE_FRAGMENTATION_DETECTED`
- `UNIFIED_CONTEXT_COMPOSED`

---

## Testes

```bash
cd backend
npm run test:cognitive-runtime-convergence
```

Snapshots: `tests/cognitive-runtime-convergence/snapshots/` (8 personas).

---

## Rollout

1. Produção: só `IMPETUS_COGNITIVE_CONVERGENCE_OBSERVABILITY=on`
2. Monitorizar `/cognitive-convergence/report` 7–14 dias
3. Piloto: `IMPETUS_RUNTIME_TRUTH_AUTHORITY=on` → `UNIFIED_COGNITIVE_CONTEXT=on`
4. Por último: `GOVERNED_AI_ORCHESTRATION` e validação/drift enforcement

---

## Rollback

```bash
export IMPETUS_UNIFIED_COGNITIVE_CONTEXT=off
export IMPETUS_RUNTIME_TRUTH_AUTHORITY=off
export IMPETUS_GOVERNED_AI_ORCHESTRATION=off
export IMPETUS_COGNITIVE_CONSISTENCY_VALIDATION=off
export IMPETUS_CONTEXT_DRIFT_DETECTION=off
export IMPETUS_COGNITIVE_CONVERGENCE_OBSERVABILITY=off
pm2 reload impetus-backend --update-env
```

Sem rollback automático. Código permanece (additive-only).

---

## Relação E→M

| Fase | Papel |
|------|--------|
| E–J | Policy, activation, operations |
| K | Semantic alignment |
| L | Delivery precision |
| **M** | Convergência de verdade contextual e consistência entre canais |

Nenhuma fase anterior é removida ou desactivada por M.
