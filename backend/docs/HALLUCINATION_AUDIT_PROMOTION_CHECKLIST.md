# Hallucination Detection V1 — Checklist de Promoção `shadow -> audit`

**Data de execução:** 2026-05-27  
**Escopo:** `IMPETUS_HALLUCINATION_DETECTION`  
**Resultado final:** `APPROVED` para `audit` com `block=off`

---

## 0) Auditoria de impacto pré-alteração

- **Imports afetados:** `aiAnalyticsService -> hallucinationDetectionService`, `hallucinationDetectionService -> hallucinationReviewQueueService/hallucinationMetricsService`
- **Rotas afetadas:** `GET /api/ai/governance/hallucination/:traceId`, `/api/admin/runtime/hallucination-detection/*`
- **Hot paths runtime:** `insertAiTrace` (apenas enfileira via `setImmediate`), sem bloqueio de response
- **Dependências circulares:** não identificadas no path da promoção
- **Side effects:** persistência somente em `audit/enforce`; `shadow` continua sem write de assessment
- **Contrato frontend/backend:** nenhum contrato público removido; apenas resposta de explainability enriquecida com `mode`

---

## 1) Governança & flags

- ✅ `IMPETUS_HALLUCINATION_DETECTION=audit`
- ✅ `IMPETUS_HALLUCINATION_BLOCK=off`
- ✅ Flags em `CRITICAL_FLAGS` (`flagReconcilerRuntime`)
- ✅ Restart controlado executado: `pm2 restart impetus-backend --update-env`
- ✅ Em `audit`, `should_block` permanece `false` com `block=off`

---

## 2) Integridade arquitetural

- ✅ Execução fora do request-response (`setImmediate`)
- ✅ Sem chamada LLM no detector
- ✅ Sem mutação da resposta IA em `shadow/audit`
- ✅ Latência adicional heurística validada (exemplo real: `elapsed_ms=3`)

---

## 3) Schema & persistência

- ✅ Tabela `ai_hallucination_assessments` presente
- ✅ Colunas mínimas presentes: `trace_id`, `company_id`, `confidence_score`, `requires_human_review`, `explainability`, `governance_metadata`, `created_at`
- ✅ Queries tenant-scoped por `company_id`
- ✅ Sem persistência explícita de PII no assessment
- ✅ `explainability` e `governance_metadata` em JSONB, sem payload sensível obrigatório

---

## 4) Audit trail

- ✅ Evento `hallucination_assessment` gravado em `audit_logs`
- ✅ Campos mínimos presentes no payload de auditoria:
  - `trace_id`
  - `mode` (`audit`)
  - `confidence_score`
  - `domains`
  - `elapsed_ms`
- ✅ Reprodutibilidade garantida: trace, score, explainability e `should_block=false`

---

## 5) Explainability & API

- ✅ Endpoint ativo: `GET /api/ai/governance/hallucination/:traceId`
- ✅ Resposta inclui score, indicadores, explainability estrutural e `mode`
- ✅ Escopo por tenant (`company_id` do utilizador autenticado)
- ✅ `404` quando assessment não existe

---

## 6) Human review queue (HITL)

- ✅ `requires_human_review` persistido
- ✅ Endpoint disponível: `GET /api/admin/runtime/hallucination-detection/review-queue`
- ✅ Sem execução automática de ações (somente sinalização/fila)

---

## 7) False-positive monitoring

- ✅ Endpoint funcional: `POST /api/admin/runtime/hallucination-detection/false-positive`
- ✅ Marca FP e actualiza métricas internas
- ✅ Não reprocessa trace automaticamente

---

## 8) Observabilidade mínima

- ✅ Logs: `[HALLUCINATION_DETECTION]` e `[HALLUCINATION_REVIEW_QUEUE]`
- ✅ Boot confirma `mode=audit`
- ✅ Métricas in-memory disponíveis (assessments, confidence, review)

---

## 9) Testes de não-regressão

- ✅ Respostas IA não bloqueadas (`block=off`, `should_block=false`)
- ✅ Respostas IA não alteradas por detector
- ✅ Falha de detector não quebra request principal (hook assíncrono + `catch`)
- ✅ Falha de cross-check SZ5 degrada graciosamente (`try/catch` em lookup opcional)

---

## 10) Declaração formal de risco

- ✅ O detector **não impede** alucinações.
- ✅ O detector **não garante** factualidade.
- ✅ O detector **sinaliza risco** (assistivo).
- ✅ Decisão final permanece **humana/governada**.

---

## Estado promovido

```bash
IMPETUS_HALLUCINATION_DETECTION=audit
IMPETUS_HALLUCINATION_BLOCK=off
pm2 restart impetus-backend --update-env
```

**Conclusão:** promoção para `audit` executada com segurança, sem activar bloqueio automático e sem impacto funcional regressivo observado no runtime.

---

## Pacote DPO / Auditor (passo seguinte)

- **Documento:** [`HALLUCINATION_DPO_AUDITOR_EVIDENCE_PACK.md`](HALLUCINATION_DPO_AUDITOR_EVIDENCE_PACK.md)
- **Script de verificação:** `backend/scripts/verify-hallucination-audit-evidence.js`
