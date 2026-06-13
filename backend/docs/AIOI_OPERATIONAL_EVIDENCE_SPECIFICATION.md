# AIOI — Operational Evidence Specification

**Camada:** P3.1 — Operational Evidence Collection  
**Serviço:** `backend/src/services/aioi/aioiOperationalEvidenceService.js`  

---

## 1. Propósito

Coleta formal de evidências operacionais reais do piloto AIOI — métricas, snapshots, throughput, latência, SLA, taxa de erro e utilização DLQ.

**Modo:** READ ONLY · zero mutação de filas, classificação ou decisões.

---

## 2. Funções

| Função | Descrição |
|--------|-----------|
| `collectOperationalEvidence()` | Agrega evidências completas do piloto |
| `registerOperationalSnapshot()` | Persiste snapshot em ring buffer (memória) |
| `getRecentSnapshots(limit)` | Recupera snapshots recentes |

---

## 3. Evidências coletadas

| Categoria | Campos |
|-----------|--------|
| Pipeline | `ioe_total`, `ioe_open`, `ioe_triaged`, `ioe_with_decision`, `ioe_executing`, `ioe_resolved`, `ioe_with_outcome`, `ioe_with_learning` |
| Throughput | `classification_rate`, `decision_rate`, `execution_rate`, `learning_rate`, `outbox_delivered` |
| Latência | `avg_outbox_latency_ms`, `avg_ioe_age_hours`, `consumer_avg_ms` |
| SLA | `breached`, `at_risk` |
| Erro | `error_rate_pct`, `dlq_utilization_pct` |
| Outbox | `pending`, `processing`, `delivered`, `failed`, `dlq_count` |

---

## 4. Proibições

- Alterar filas ou estados IOE
- Reconstruir F47
- LLM / rerank / weight_versions

---

## 5. Token

**OPERATIONAL_EVIDENCE_CERTIFIED**
