# Pacote de Evidências — Hallucination Detection V1 (Auditor / DPO)

**Produto:** IMPETUS Comunica IA  
**Versão:** Hallucination Detection V1  
**Estado operacional:** `IMPETUS_HALLUCINATION_DETECTION=audit` · `IMPETUS_HALLUCINATION_BLOCK=off`  
**Data do pacote:** 2026-05-27  
**Classificação:** Uso interno — Auditoria, DPO, Compliance, ISO 42001

---

## 1. Sumário executivo (1 página)

O IMPETUS implementou detecção de alucinações **assistiva e não bloqueante**. Em modo `audit`, cada interação IA registada em `ai_interaction_traces` é avaliada **de forma assíncrona** (fora do tempo de resposta ao utilizador), com:

- score de confiança e grounding;
- cross-check heurístico com factos operacionais (SZ5);
- metadados de governança e explainability;
- trilha em `audit_logs` e, quando aplicável, fila de revisão humana.

**O sistema não substitui decisão humana nem garante factualidade.** Sinaliza risco para auditoria e HITL.

| Afirmação legal/técnica | Estado |
|-------------------------|--------|
| Bloqueio automático de respostas IA | **Desactivado** (`BLOCK=off`) |
| Alteração do texto da resposta IA pelo detector | **Não** (shadow/audit) |
| Persistência de avaliações por tenant | **Sim** (`company_id` obrigatório) |
| PII explícita na tabela de assessments | **Não** (scores + metadados técnicos) |
| Reconstrução de linha do tempo por `trace_id` | **Sim** (BD + API + audit_logs) |

**Documentos irmãos:**  
[`HALLUCINATION_DETECTION_V1_REPORT.md`](HALLUCINATION_DETECTION_V1_REPORT.md) · [`HALLUCINATION_AUDIT_PROMOTION_CHECKLIST.md`](HALLUCINATION_AUDIT_PROMOTION_CHECKLIST.md)

---

## 2. Posicionamento de risco (declaração formal)

Para efeitos de LGPD, ISO/IEC 42001 e auditoria interna:

1. O detector **não impede** a emissão de respostas potencialmente incorretas.
2. O detector **não garante** que a resposta está factualmente correcta.
3. O detector **classifica e sinaliza** risco com base em heurísticas e contexto operacional.
4. A **decisão final** (aceitar, rejeitar, ajustar) permanece com processos humanos e governança existente (`human_validation_status`, políticas de chat, HITL).

Esta declaração deve constar em materiais de onboarding de auditores e no dossiê de DPIA/ROPA quando o módulo for referenciado.

---

## 3. Arquitectura verificável (sem acesso ao código)

```
Utilizador → Chat / Módulos IA → Resposta entregue (inalterada em audit)
                                    │
                                    └── insertAiTrace (síncrono, mínimo)
                                            └── setImmediate → hallucinationDetectionService
                                                    ├── Validadores (contexto, estrutura, SZ5)
                                                    ├── ai_hallucination_assessments (persist)
                                                    ├── audit_logs (hallucination_assessment)
                                                    └── Fila HITL (se requires_human_review)
```

**Garantias de desenho:**

- Sem chamadas LLM no path do detector (performance previsível).
- Falhas no detector não propagam para a resposta ao utilizador (`try/catch` + fila async).
- Isolamento multi-tenant: todas as leituras/escritas de assessment filtram por `company_id`.

---

## 4. Flags e governança

| Flag | Valor em produção (dotenv) | Efeito |
|------|----------------------------|--------|
| `IMPETUS_HALLUCINATION_DETECTION` | `audit` | Avalia + persiste + audit trail |
| `IMPETUS_HALLUCINATION_BLOCK` | `off` | Impede bloqueio automático |
| `IMPETUS_HALLUCINATION_REVIEW_THRESHOLD` | `0.55` | Limiar para `requires_human_review` |

Flags registadas em `CRITICAL_FLAGS` (`backend/src/governance/flagReconcilerRuntime.js`).

**Rollback imediato:**

```bash
IMPETUS_HALLUCINATION_DETECTION=shadow   # ou off
IMPETUS_HALLUCINATION_BLOCK=off
pm2 restart impetus-backend --update-env
```

---

## 5. Artefactos de dados

### 5.1 Tabela principal

**Nome:** `ai_hallucination_assessments`  
**Migration:** `backend/src/models/ai_hallucination_detection_migration.sql`

| Coluna | Finalidade auditoria |
|--------|----------------------|
| `trace_id` | Chave de correlação com `ai_interaction_traces` |
| `company_id` | Isolamento tenant (LGPD) |
| `confidence_score` | Score agregado 0–1 |
| `requires_human_review` | Sinalização HITL |
| `explainability` | Razões técnicas (JSONB, sem texto integral da conversa) |
| `governance_metadata` | `mode`, `elapsed_ms`, domínios, `block_enabled` |
| `false_positive_marked` | Controlo de qualidade do detector |
| `created_at` | Timestamp UTC |

### 5.2 Trilha de auditoria

**Tabela:** `audit_logs`  
**Action:** `hallucination_assessment`  
**Payload JSON (description):** `trace_id`, `mode`, `confidence_score`, `domains`, `elapsed_ms`, `requires_human_review`, `should_block`

---

## 6. Snapshot de evidência (runtime 2026-05-27)

Colectado via script interno após promoção `audit`:

| Métrica | Valor |
|---------|-------|
| Modo efectivo | `audit` |
| Bloqueio activo | `false` |
| Limiar revisão | `0.55` |
| Assessments persistidos | 1 |
| Fila revisão pendente | 0 |
| Falsos positivos marcados | 0 |
| Média confidence (amostra) | 0.8533 |
| Eventos `hallucination_assessment` em audit_logs | 1 |

> À medida que o tráfego IA aumentar, estes contadores devem ser reexecutados (secção 7).

---

## 7. Comandos de verificação (auditor independente)

### 7.1 Script automatizado (recomendado)

```bash
cd /var/www/impetus-completa/backend
node scripts/verify-hallucination-audit-evidence.js
```

Saída esperada: JSON com `ok: true`, `mode: "audit"`, `block_enabled: false`, estatísticas de tabela e amostra de `audit_logs`.

### 7.2 SQL — integridade e isolamento

```sql
-- Existência da tabela
SELECT COUNT(*) FROM ai_hallucination_assessments;

-- Assessments por tenant (substituir UUID)
SELECT trace_id, confidence_score, requires_human_review, severity, created_at
FROM ai_hallucination_assessments
WHERE company_id = '<COMPANY_UUID>'
ORDER BY created_at DESC
LIMIT 20;

-- Trilha de auditoria para um trace
SELECT id, action, description, created_at, company_id
FROM audit_logs
WHERE action = 'hallucination_assessment'
  AND description::text LIKE '%<TRACE_UUID>%'
ORDER BY created_at DESC;

-- Confirmar ausência de bloqueio nos metadados recentes
SELECT trace_id,
       governance_metadata->>'mode' AS mode,
       governance_metadata->>'block_enabled' AS block_enabled
FROM ai_hallucination_assessments
ORDER BY created_at DESC
LIMIT 10;
```

### 7.3 Logs PM2

```bash
pm2 logs impetus-backend --lines 50 --nostream | grep HALLUCINATION
```

Evidência esperada no boot:

```text
[HALLUCINATION_DETECTION_BOOT] ... "mode":"audit","block_enabled":false
```

### 7.4 API — explainability (utilizador autenticado do tenant)

```http
GET /api/ai/governance/hallucination/{traceId}
Authorization: Bearer <JWT>
```

Resposta esperada (200):

```json
{
  "ok": true,
  "mode": "audit",
  "assessment": {
    "trace_id": "...",
    "confidence_score": 0.85,
    "indicators": [],
    "explainability": { "contextual_reason": "...", "review_threshold": 0.55 },
    "governance_metadata": { "mode": "audit", "block_enabled": false }
  }
}
```

`404` — trace sem assessment (ex.: período shadow anterior ou trace inválido).

### 7.5 API — painel admin runtime

Requer JWT (`requireAuth`):

```http
GET /api/admin/runtime/hallucination-detection
GET /api/admin/runtime/hallucination-detection/review-queue?company_id=<UUID>&limit=50
```

Marcar falso positivo (sem reprocessar trace):

```http
POST /api/admin/runtime/hallucination-detection/false-positive
Content-Type: application/json

{
  "trace_id": "<UUID>",
  "company_id": "<UUID>",
  "reason": "Auditoria: indicador incorreto"
}
```

---

## 8. Reconstrução de linha do tempo (caso de investigação)

Para um incidente ou pedido do titular envolvendo uma resposta IA:

| Passo | Fonte | O que obter |
|-------|-------|-------------|
| 1 | `ai_interaction_traces` | Input/output original, `human_validation_status` |
| 2 | `ai_hallucination_assessments` | Score, indicadores, explainability |
| 3 | `audit_logs` | Evento `hallucination_assessment` com `mode` e `should_block` |
| 4 | `GET /api/ai/governance/lineage/:traceId` | Linhagem de prompt (se activada) |
| 5 | `GET /api/ai/governance/traces/:traceId/card` | AI card + governança no trace |
| 6 | Logs `[HALLUCINATION_DETECTION]` | Timestamp e `elapsed_ms` da avaliação |

**Critério de conformidade:** em modo `audit`, `should_block` no payload de auditoria deve ser `false` com `BLOCK=off`.

---

## 9. LGPD — notas para DPO

| Tema | Tratamento |
|------|------------|
| Base legal | Execução de contrato / legítimo interesse (conforme política da empresa cliente) + governança de IA |
| Minimização | Assessment não armazena cópia integral da conversa; referencia `trace_id` |
| Isolamento | `company_id` em todas as queries de leitura API e BD |
| Direito de acesso | Export DSR pode incluir `ai_interaction_traces` + assessments ligados ao titular |
| Direito ao apagamento | Assessments seguem ciclo do trace/tenant; políticas de retenção T1.7 aplicáveis |
| Decisão automatizada | **Não há decisão automatizada com efeito legal**; detector é assistivo |

---

## 10. Índice de ficheiros (auditoria de código)

| Componente | Caminho |
|------------|---------|
| Orquestrador | `backend/src/services/hallucinationDetectionService.js` |
| Fila HITL | `backend/src/services/hallucinationReviewQueueService.js` |
| Métricas | `backend/src/services/hallucinationMetricsService.js` |
| Hook pós-trace | `backend/src/services/aiAnalyticsService.js` |
| API explainability | `backend/src/routes/aiGovernance.js` |
| API admin | `backend/src/routes/admin/runtimeFlags.js` |
| Schema | `backend/src/models/ai_hallucination_detection_migration.sql` |
| Boot | `backend/src/server.js` (`[HALLUCINATION_DETECTION_BOOT]`) |

---

## 11. Critérios de aceite para próxima fase (`enforce`)

Promover para `enforce` **somente** se:

- Taxa de falsos positivos críticos < 2% (amostra ≥ 200 assessments);
- Fila HITL operacional com SLA interno definido;
- Aprovação explícita DPO + responsável de produto;
- `IMPETUS_HALLUCINATION_BLOCK` permanece `off` até revisão legal separada.

---

## 12. Assinatura de evidência (template)

| Campo | Valor |
|-------|-------|
| Ambiente verificado | Produção / Staging: _______________ |
| Verificador | Nome / Função: _______________ |
| Data | _______________ |
| Resultado | ☐ Conforme ☐ Não conforme ☐ Conforme com ressalvas |
| Observações | _______________ |

---

*Pacote gerado no âmbito da promoção `shadow → audit` do Hallucination Detection V1. Para questões técnicas, consultar também `HALLUCINATION_AUDIT_PROMOTION_CHECKLIST.md`.*
