# AIOI — Operational Observability Specification

**Camada:** P2.3 — Operational Observability  
**Modo:** READ ONLY · zero IA · zero F47 rebuild  

---

## 1. Serviços

| Serviço | Responsabilidade |
|---------|------------------|
| `aioiOperationalMetricsService.js` | Agregação métricas outbox + SLA + bridges |
| `aioiOperationalHealthService.js` | Health snapshot + readiness |
| `aioiOperationalTelemetryService.js` | Logs estruturados + ring buffer |

---

## 2. Métricas obrigatórias

| Métrica | Fonte |
|---------|-------|
| `worker_status` | `aioiOutboxWorkerService.getWorkerStatus()` |
| `outbox_pending` | Query `aioi_outbox` status=pending |
| `outbox_processing` | Query status=processing |
| `outbox_delivered` | Query status=delivered |
| `outbox_failed` | Query status=failed |
| `dlq_count` | Alias de `outbox_failed` (MAX_ATTEMPTS esgotado) |
| `classification_rate` | Média processed/batch (sessão worker) |
| `decision_rate` | `aioiDecisionMetrics` session |
| `execution_rate` | `aioiExecutionMetrics` session |
| `learning_rate` | `aioiLearningMetrics` session |
| `sla_breached` | IOE `breach_state='breached'` |
| `sla_at_risk` | IOE `breach_state='at_risk'` |

---

## 3. Telemetria

Eventos estruturados via `aioiOperationalTelemetryService`:

- `cycle_started` / `cycle_completed` / `cycle_error`
- `worker_started` / `worker_stopped`
- `health_snapshot`
- `classification_batch_recorded`

Ring buffer: últimos 200 eventos (memória, não persistido).

---

## 4. Proibições

- Reconstruir filas F47
- Consultar F47 para métricas AIOI
- LLM / rerank na observabilidade
- Expor `decision_payload` completo em logs

---

## 5. Token

**OPERATIONAL_OBSERVABILITY_CERTIFIED**
