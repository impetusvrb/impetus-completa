# WAVE 4 — Plano: Contexto Cognitivo Seguro (Anti-Saturação)

> Impede saturação futura da IA operacional. **Não** altera `cognitiveOrchestrator`, authority router, memória legada nem comportamento com flags desligadas.

## 1. Arquitetura cognitiva segura

```
buildOperationalContext() ──► safeCognitiveContextPipeline
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
            aiContextBudget   factCompression  summarizationEngine
            (persona/tenant/   (facts densos)  (passive/active)
             domain/module)
                    │
                    ▼
            tokenGovernance ◄── quotas 24h tenant
                    │
                    ▼
            saturationProtection ◄── cognitivePressureService
                    │
            aiAutoloopGuard (paralelo, pré-invocação)
```

**Master gate:** `IMPETUS_AI_CONTEXT_BUDGET_ENABLED=false`

## 2. Budget strategy

| Dimensão | Chave | Default tokens | Notas |
|----------|-------|----------------|-------|
| Persona | `operator` | 4000 | campo |
| Persona | `supervisor` | 6000 | |
| Persona | `manager` | 8000 | |
| Persona | `director` | 12000 | executivo |
| Tenant | `company_id` | env quota 24h | `IMPETUS_AI_TOKEN_QUOTA_PER_TENANT` |
| Domain | `operational` | 8000 | |
| Domain | `quality/safety/...` | 6000 | industrial futuro |
| Module | `dashboard_chat` | 10000 | |
| Module | `council` | 15000 | |

**Resolução:** `min(persona, domain, module)` ∩ quota tenant restante.

## 3. Summarization contracts

```json
{
  "contract_version": 1,
  "input_ref": "memory_binding_block",
  "output": {
    "summary": "string",
    "facts": [{ "id": "f1", "text": "...", "source": "eventos_empresa", "confidence": 0.9 }],
    "tokens_before": 0,
    "tokens_after": 0
  },
  "mode": "passive|active",
  "hallucination_guards": ["no_new_entities", "source_required"]
}
```

## 4. Fallback strategy

| Cenário | Acção |
|---------|--------|
| Budget OFF | Bloco original intacto |
| Summarizer OFF | Só truncagem por budget |
| Summarizer falha | Truncagem + log `[COGNITIVE_BUDGET_FALLBACK]` |
| Quota tenant esgotada | Resposta degradada (metadados only) se `ENFORCE` |
| Pressão crítica | `saturationProtection` reduz budget 50% |

## 5. Hallucination mitigation

- Facts comprimidos exigem `source` ∈ fontes conhecidas.
- Sufixo invariante: «Use apenas factos listados; não extrapole.»
- Remoção de secções vazias pós-compressão.
- Registo em `ai_decision_logs.metadata.budget_applied` (futuro opt-in write).

## 6. Loop prevention strategy

- `aiAutoloopGuard`: janela deslizante por `(company_id, conversation_id)`.
- Limite: `IMPETUS_AI_AUTOLOOP_MAX_DEPTH` (default 4) invocações encadeadas / 60s.
- Default: **detect + log**; bloqueio só com `IMPETUS_AI_AUTOLOOP_GUARD_ENFORCE=true`.

## 7. Gate W4→W5

- Redução ≥30% tokens estimados em staging (chat).
- Zero bloqueios indevidos de autoloop em 7 dias.
- Quota tenant sem falsos positivos.

## 8. Módulos

`backend/src/cognitiveBudget/` — ver ficheiros no repositório.
