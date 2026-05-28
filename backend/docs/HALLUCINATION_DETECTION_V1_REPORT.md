# Hallucination Detection V1 — Relatório Enterprise (PROMPT 13)

**Data:** 2026-05-27  
**Modo inicial:** `IMPETUS_HALLUCINATION_DETECTION=shadow`  
**Bloqueio:** `IMPETUS_HALLUCINATION_BLOCK=off` (deny-first desactivado)

---

## 1. Objectivo

Camada enterprise de detecção de alucinações em respostas IA, integrada ao pipeline de traces existente, sem degradação severa de performance nem bloqueios críticos por defeito.

## 2. Capacidades implementadas

| # | Capacidade | Implementação |
|---|------------|---------------|
| 1 | Fact grounding | `contextualResponseValidation` + `responseStructureValidation` |
| 2 | Cross-check SZ5 | Facts de `prioritized_actions` / `predictions` + `validateFact` + amostra `operational_memory` |
| 3 | Confidence score | Agregação ponderada multi-sinal |
| 4 | Contradiction detector | Heurísticas leves (polaridade, percentagens, existência) |
| 5 | Semantic validator | Overlap entidades do contexto |
| 6 | Low-confidence flagging | `confidence_score < IMPETUS_HALLUCINATION_REVIEW_THRESHOLD` |
| 7 | Human review queue | `ai_hallucination_assessments.requires_human_review` + admin API |
| 8 | Runtime explainability | Campo `explainability` JSONB + `GET /api/ai/governance/hallucination/:traceId` |
| 9 | Governance metadata | Campo `governance_metadata` JSONB (mode, elapsed_ms, domains) |
| 10 | Audit trail | `audit_logs` action `hallucination_assessment` |
| 11 | False-positive monitoring | `POST .../false-positive` + métrica `false_positive_rate` |
| 12 | Drift tracking | Hook `continuousValidationEngine.validate` + referência drift runtime |
| 13 | Multi-domain validation | Regras por `module_name` (maintenance, production, etc.) |

## 3. Flags

| Flag | Default | Valores | Efeito |
|------|---------|---------|--------|
| `IMPETUS_HALLUCINATION_DETECTION` | `shadow` | off/shadow/audit/enforce | Controla avaliação e persistência |
| `IMPETUS_HALLUCINATION_BLOCK` | `off` | off/on | Bloqueio só em enforce + score < 0.25 + ≥3 indicadores |
| `IMPETUS_HALLUCINATION_REVIEW_THRESHOLD` | `0.55` | 0–1 | Limiar fila de revisão humana |

**Flag Reconciler:** ambas registadas em `CRITICAL_FLAGS`.

## 4. Ficheiros

| Ficheiro | Tipo |
|----------|------|
| `backend/src/services/hallucinationDetectionService.js` | Orquestrador |
| `backend/src/services/hallucinationReviewQueueService.js` | Fila HITL |
| `backend/src/services/hallucinationMetricsService.js` | Métricas in-memory |
| `backend/src/models/ai_hallucination_detection_migration.sql` | Schema |
| `backend/src/services/aiSchemaBootstrap.js` | Bootstrap idempotente |
| `backend/src/services/aiAnalyticsService.js` | Hook pós-trace (non-blocking) |
| `backend/src/routes/admin/runtimeFlags.js` | Admin dashboard APIs |
| `backend/src/routes/aiGovernance.js` | Explainability tenant-scoped |

## 5. Rotas afectadas

| Método | Rota | RBAC |
|--------|------|------|
| GET | `/admin/runtime/hallucination-detection` | Admin runtime |
| GET | `/admin/runtime/hallucination-detection/review-queue` | Admin + `company_id` |
| POST | `/admin/runtime/hallucination-detection/false-positive` | Admin |
| POST | `/admin/runtime/hallucination-detection/bootstrap-schema` | Admin |
| GET | `/api/ai/governance/hallucination/:traceId` | Auth + tenant |

## 6. Serviços / hot paths

- **Hot path:** `aiAnalyticsService.insertAiTrace` → `enqueueTraceAssessment` via `setImmediate` (async, não bloqueia resposta ao utilizador).
- **Sem chamadas LLM** no path de detecção (target < 50ms heurístico).
- Motor A / Engine V2: **não alterados**.

## 7. Rollout recomendado

1. **Shadow** (actual): log + métricas, zero persistência BD.
2. **Audit**: persistir `ai_hallucination_assessments` + audit trail.
3. **Enforce**: igual audit; activar `IMPETUS_HALLUCINATION_BLOCK=on` apenas após validação de falsos positivos < 2%.

## 8. Rollback

```bash
IMPETUS_HALLUCINATION_DETECTION=off
IMPETUS_HALLUCINATION_BLOCK=off
pm2 restart impetus-backend --update-env
```

Tabela `ai_hallucination_assessments` pode permanecer (additive); dados históricos preservados.

## 9. Riscos

| Risco | Mitigação |
|-------|-----------|
| Falsos positivos em bloqueio | `BLOCK=off` por defeito; critérios restritivos (score < 0.25, ≥3 indicadores) |
| Performance | `setImmediate`, heurísticas only, buffers limitados em métricas |
| SZ5 sem tabela `operational_memory` | try/catch; cross-check degrada gracefully |
| Shadow sem explainability API | 404 esperado até modo audit |

## 10. Dependências

- `contextualResponseValidation.js`
- `responseStructureValidation.js`
- `cognitiveBudgetContracts.js` (`validateFact`)
- `continuousValidationEngine.js`
- `ai_interaction_traces`, `audit_logs`
- Opcional: `operational_memory`

## 11. Observabilidade

- Logs estruturados: `[HALLUCINATION_DETECTION]`, `[HALLUCINATION_REVIEW_QUEUE]`
- Boot: `[HALLUCINATION_DETECTION_BOOT]`
- Métricas: `GET /admin/runtime/hallucination-detection`

## 12. Conformidade

- **LGPD:** avaliações scoped por `company_id`; sem PII extra na fila.
- **Auditabilidade:** `audit_logs` + tabela dedicada.
- **Explainability:** JSONB `explainability` por trace.
- **Backward compatibility:** hook additive; respostas IA inalteradas em shadow/audit.

---

*Gerado no âmbito PROMPT 13 — IMPETUS Comunica IA.*
