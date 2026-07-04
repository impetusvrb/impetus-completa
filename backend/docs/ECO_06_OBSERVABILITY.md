# ECO-06 — Observabilidade Conversation Context Consumer

**Fase:** 6 · **Data:** 2026-07-02

---

## Endpoint

```
GET /api/audit/eco-context/status
```

Resposta:
- `enabled` / `shadow_mode`
- `shadow_total`, `matches`, `divergences`
- `local_queries`, `kb_queries`
- `knowledge_reused`, `duplicates_eliminated`
- `avg_legacy_ms`, `avg_governance_ms`
- `adapter.events_evaluated`, `adapter.certified_types`

---

## Métricas

| Métrica | Descrição |
|---------|-----------|
| `eco_context_shadow_total` | Resoluções shadow |
| `eco_context_shadow_match` | Matches local vs KB |
| `eco_context_shadow_divergence` | Divergências (institutional gap) |
| `eco_context_consumer_total` | Modo consumer |
| `eco_context_knowledge_reused` | KB refs reutilizadas |
| `eco_context_local_queries` | Consultas perfil local |
| `eco_context_kb_queries` | Consultas Knowledge Base |
| `eco_context_duplicates_eliminated` | Refs duplicadas evitadas |
| `eco_context_consumer_events` | Total eventos adapter |

---

## Campos registados

| Campo | Shadow | Consumer |
|-------|--------|----------|
| institutional gap compare | ✅ | — |
| governance_knowledge_shadow | ✅ | — |
| institutional_knowledge | — | ✅ |
| prompt_append enrich | — | ✅ (flag ON) |
| conversation_context_preserved | ✅ | ✅ |

---

## Enriquecimentos resolveConversationContext

**Shadow (OFF):**
```json
{
  "governance_knowledge_shadow": {
    "comparison": { "match": false, "institutionalGap": true },
    "governance_knowledge": { "refIds": ["kb_policy_..."] },
    "local_parallel": { "refIds": [] }
  }
}
```

**Consumer (ON):**
```json
{
  "institutional_knowledge": { "source": "event_governance", "refIds": [...] },
  "knowledge_source": "event_governance",
  "conversation_context_preserved": true
}
```

UX existente **inalterada** em shadow — campos aditivos; prompt só muda com flag ON.

---

## Critérios activação

| Critério | Threshold |
|----------|-----------|
| ECO-03 shadow match | ≥ 85% |
| ECO-04/05 shadow match | ≥ 85% |
| ECO-06 institutional gap resolvido | ≥ 85% consumer refs |
| Estabilidade | 7 dias |
