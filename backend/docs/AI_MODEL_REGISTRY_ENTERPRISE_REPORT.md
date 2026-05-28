# AI Model Registry + AI Cards — PROMPT 12 Implementation Report

**Data:** 2026-05-27  
**Classificação:** ENTERPRISE / ISO 42001 / LGPD Art. 20  
**Estado:** PRODUÇÃO GOVERNADA (MODE=audit)  
**Sprint:** T1.A.3 — AI Safety + Observabilidade

---

## 1. RESUMO EXECUTIVO

Implementação enterprise-grade de **AI Governance** com Model Registry, AI Cards e Prompt Lineage:

- **ai_model_registry** — registo canónico de modelos (5 modelos seed)
- **AI Cards** — metadados de transparência, risco, ISO 42001 controls
- **Prompt Lineage** — hash de prompt, provider/temperature/context lineage
- **Runtime metadata** — enrichment em `ai_interaction_traces.model_info`
- **Governance persistence** — hook não-bloqueante pós-trace
- **ISO 42001 readiness** — relatório agregado sem PII

---

## 2. ARQUITECTURA

```
insertAiTrace (existente)
       │
       ▼
enqueueTraceGovernance (hook additive)
       │
       ├── aiModelRegistry.buildAiCard()
       ├── aiPromptLineageService.persistLineage()
       ├── UPDATE ai_interaction_traces.model_info (mode=on)
       ├── UPDATE chat_messages.ai_governance_metadata (mode=on)
       └── INSERT audit_logs (ai_governance_trace)
```

---

## 3. FLAGS

| Flag | Default | Valores | Propósito |
|------|---------|---------|-----------|
| `IMPETUS_AI_MODEL_REGISTRY` | `audit` | off/audit/on | Registry sync + cards |
| `IMPETUS_AI_GOVERNANCE_PERSISTENCE` | `audit` | off/audit/on | Lineage + trace enrichment |

**Flag Reconciler:** `IMPETUS_AI_MODEL_REGISTRY` = CRITICAL_FLAG

---

## 4. TABELAS (ADDITIVE)

### ai_model_registry
- model_key, provider, model_id, version
- risk_classification (LOW|MEDIUM|HIGH|CRITICAL)
- governance_metadata, ai_card, iso_42001_controls

### ai_prompt_lineage
- trace_id (unique), company_id, prompt_hash
- provider_lineage, temperature_lineage, context_lineage
- confidence_snapshot, explainability_ref, runtime_metadata
- chat_message_id, legal_audit_log_id (optional refs)

### chat_messages
- **Nova coluna:** `ai_governance_metadata JSONB` (nullable)

---

## 5. MODELOS REGISTADOS (SEED)

| model_key | Provider | Risk | ISO Controls |
|-----------|----------|------|--------------|
| openai:gpt-4o | OpenAI | MEDIUM | A.5.2, A.6.2.2, A.8.2 |
| openai:gpt-4o-mini | OpenAI | LOW | A.5.2, A.6.2.2 |
| anthropic:claude-3-5-sonnet | Anthropic | MEDIUM | A.5.2, A.6.2.2, A.8.2 |
| google:gemini-1.5-pro | Google | MEDIUM | A.5.2, A.6.2.2 |
| impetus:cognitive-council | IMPETUS | HIGH | A.5.2, A.6.2.2, A.8.2, A.9.3 |

---

## 6. LINEAGE TRACKING

| Dimensão | Persistido | PII |
|----------|-----------|-----|
| Prompt | SHA-256 hash only | ❌ |
| Provider | provider, model, stages | ❌ |
| Temperature | temperature, max_tokens, top_p | ❌ |
| Context | session/conversation refs, key names | ❌ |
| Confidence | score, risk_level, degraded flag | ❌ |
| Explainability | trace_id, governance_tags | ❌ |

---

## 7. APIs

### Tenant (requireAuth)
| Endpoint | Função |
|----------|--------|
| `GET /api/ai/governance/models` | Lista modelos registry |
| `GET /api/ai/governance/models/:key/card` | AI Card de modelo |
| `GET /api/ai/governance/traces/:traceId/card` | AI Card de trace |
| `GET /api/ai/governance/lineage/:traceId` | Prompt lineage |
| `GET /api/ai/governance/compliance/iso42001` | Readiness ISO 42001 |

### Admin
| Endpoint | Função |
|----------|--------|
| `GET /api/admin/runtime/ai-governance` | Diagnostics + ISO report |
| `POST /api/admin/runtime/ai-governance/sync-registry` | Sync seed → DB |
| `GET /api/admin/runtime/ai-governance/iso42001` | ISO 42001 report |
| `GET /api/admin-portal/ai-governance/models` | Admin model list |
| `GET /api/admin-portal/ai-governance/iso42001` | Admin ISO report |

---

## 8. EVIDÊNCIA OPERACIONAL

```
Schema bootstrap: OK
Registry sync: 5 models (mode=audit)
Lineage persist (mode=on): lineage_id=fe0f6d8f-...
ISO42001: 5 registry models, 1 lineage record
Boot: [AI_MODEL_REGISTRY_BOOT] schema=true sync={synced:5}
```

---

## 9. ISO 42001 READINESS

| Controlo | Implementação |
|----------|---------------|
| A.5.2 — AI policy | ai_model_registry.governance_metadata |
| A.6.2.2 — AI system documentation | AI Cards + model registry |
| A.8.2 — External reporting | ISO42001 readiness endpoint |
| A.9.3 — Human oversight | HITL via human_validation_status |
| Explainability | ai_decision_logs + prompt_lineage |
| Audit trail | audit_logs + ai_legal_audit_logs |

---

## 10. ROLLBACK

| Cenário | Acção |
|---------|-------|
| Desactivar governance | `IMPETUS_AI_MODEL_REGISTRY=off` + `IMPETUS_AI_GOVERNANCE_PERSISTENCE=off` |
| Parar lineage writes | `IMPETUS_AI_GOVERNANCE_PERSISTENCE=audit` |
| Remover enrichment | mode=audit (traces legados intactos) |

---

## 11. ARTEFATOS

| Artefato | Caminho |
|----------|---------|
| Migration SQL | `backend/src/models/ai_model_registry_migration.sql` |
| Model Registry | `backend/src/governance/aiModelRegistry.js` |
| Prompt Lineage | `backend/src/services/aiPromptLineageService.js` |
| Governance Persistence | `backend/src/services/aiGovernancePersistenceService.js` |
| Schema Bootstrap | `backend/src/services/aiSchemaBootstrap.js` |
| Governance Routes | `backend/src/routes/aiGovernance.js` |
| Trace Hook | `backend/src/services/aiAnalyticsService.js` (additive) |
| Este relatório | `backend/docs/AI_MODEL_REGISTRY_ENTERPRISE_REPORT.md` |

---

**CONCLUSÃO:** PROMPT 12 CONCLUÍDO. Sistema em `MODE=audit`. Pronto para `on` após validação DPO/security.
