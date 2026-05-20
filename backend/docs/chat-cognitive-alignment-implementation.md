# Fase W — Chat Cognitive Alignment — Implementação

## Objetivo

Estabilizar o **runtime conversacional** da IA operacional: medir alinhamento contextual, qualidade de guidance, reasoning, leakage e integridade narrativa — **shadow-first**, sem reescrita automática.

---

## Arquitetura

```
POST /dashboard/chat
        │
        ▼
chatRuntimeAlignmentFacade.enrichChatRuntimeAlignment
        ├── chatContextualAlignmentEngine
        ├── operationalGuidanceQualityEngine
        ├── chatSemanticReasoningStabilizer
        ├── chatHierarchyIsolationGuard
        ├── chatLeakageDetector
        ├── chatNarrativeIntegrityEngine
        ├── chatOperationalConfidenceEngine
        └── chatAmbiguityAnalyzer
```

---

## Feature flags

| Variável | Default |
|----------|---------|
| `IMPETUS_CHAT_ALIGNMENT_RUNTIME` | **off** |
| `IMPETUS_CHAT_GUIDANCE_QUALITY` | **off** |
| `IMPETUS_CHAT_REASONING_STABILIZATION` | **off** |
| `IMPETUS_CHAT_HIERARCHY_ISOLATION` | **off** |
| `IMPETUS_CHAT_LEAKAGE_DETECTION` | **off** |
| `IMPETUS_CHAT_RUNTIME_OBSERVABILITY` | **on** |

---

## API interna

Base: `/api/internal/chat-alignment`

| GET | Rota |
|-----|------|
| | `/status` |
| | `/guidance` |
| | `/reasoning` |
| | `/leakage` |
| | `/ambiguity` |
| | `/confidence` |
| | `/narrative` |
| | `/report` |

---

## Integração `POST /dashboard/chat`

Blocos opcionais aditivos:

- `chat_alignment`
- `chat_operational_guidance`
- `chat_runtime_confidence`
- `chat_reasoning_quality`
- `chat_narrative_integrity`
- `chat_leakage_analysis`

Payload legacy (`reply`, `message`, `content`) **inalterado**.

---

## Eventos de log

- `GENERIC_OPERATIONAL_RESPONSE_DETECTED`
- `LOW_GUIDANCE_UTILITY_DETECTED`
- `CHAT_CONTEXTUAL_LEAKAGE_DETECTED`
- `WEAK_OPERATIONAL_REASONING_DETECTED`
- `CHAT_HIERARCHY_MISMATCH_DETECTED`
- `CHAT_AMBIGUITY_DETECTED`
- `LOW_CONVERSATIONAL_CONFIDENCE`
- `NARRATIVE_INCONSISTENCY_DETECTED`

---

## Regras operacionais (V.10)

- **Não** auto-corrigir, bloquear ou reescrever respostas  
- **Sim** observar, medir, recomendar, auditar  

---

## Plano de rollout

| Etapa | Acção |
|-------|--------|
| 1 | KPI + Summary estáveis (T/U/V) |
| 2 | Observabilidade W ON |
| 3 | Monitorizar `/api/internal/chat-alignment/report` |
| 4 | Activar canal `chat` via Phase S (supervisionado) |
| 5 | Revisar recomendações antes de enforcement |

---

## Testes

```bash
npm run test:chat-cognitive-alignment
```

Snapshots: executive, director, coordinator, supervisor, operator, hr, financial, quality, environmental, safety, logistics, engineering.

---

## Rollback

Flags W → `off` + PM2 reload. Preservar pipelines legacy e UX existente.
