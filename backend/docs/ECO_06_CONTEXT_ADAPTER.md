# ECO-06 — Conversation Knowledge Consumer Adapter

**Fase:** 6 · **Data:** 2026-07-02 · **ADR:** ADR-ECO-004

---

## Ficheiro

`backend/src/services/governanceAdapters/conversationKnowledgeConsumerAdapter.js`

---

## Fluxo

```text
Conversation
        ↓
Conversation Context Engine (resolveConversationContext)
        ↓
conversationKnowledgeConsumerAdapter.processConversationKnowledge
        ↓
governanceKnowledgeBaseService (queryKnowledge / buildInstitutionalKnowledgeReport)
        ↓
Contexto enriquecido (consumer) ou shadow compare (OFF)
```

---

## API interna

| Função | Descrição |
|--------|-----------|
| `inferLocalParallelKnowledge(context)` | Conhecimento local legado (vazio — CCE nunca teve índice KB) |
| `queryGovernanceKnowledge(companyId, context)` | Consulta refs certificadas read-only |
| `compareShadow(local, gov)` | Compara overlap / institutional gap |
| `buildKnowledgePromptBlock(govKnowledge)` | Bloco prompt com refIds sanitizados |
| `processConversationKnowledge(companyId, context)` | Entry point shadow/consumer |

---

## Tipos certificados

`policy`, `decision`, `recommendation`, `similar_case`, `history`

Apenas referências — **nunca** duplicar conteúdo institucional completo.

---

## Flag

`ECO_CONTEXT_VIA_EG` — serviço `ecoContextFlags.js`

| Valor | Modo |
|-------|------|
| `false` | Shadow — sem alteração de `prompt_append` |
| `true` | Consumer — append bloco KB certificado |

---

## Garantias

- `recalculated: false` no payload governance
- Não invoca `eventGovernanceExecutionService`
- Não altera `governanceKnowledgeBaseService.js`
- Rollback independente de ECO-03/04/05
