# AIOI — Production Stability Specification

**Camada:** P3.5 — Production Stability Validation  
**Serviço:** `backend/src/services/aioi/aioiProductionStabilityService.js`  

---

## 1. Propósito

Demonstrar estabilidade operacional do piloto via métricas de worker e ciclos de processamento.

---

## 2. Métricas registadas

| Métrica | Fonte |
|---------|-------|
| `worker_uptime_ms` / `worker_uptime_hours` | Timestamp arranque worker |
| `restart_count` | `restartWorker()` |
| `processing_cycles` | Ciclos OK |
| `failed_cycles` | Ciclos com erro |
| `health_transitions` | Transições HEALTHY/DEGRADED/STANDBY |
| `average_batch_duration_ms` | Média duração ciclo |
| `average_processing_latency_ms` | Média latência por item |

---

## 3. Integração (additive P2)

- `aioiOutboxWorkerService` chama `recordCycle()` após cada ciclo
- `aioiOperationalHealthService` chama `recordHealthTransition()` em mudanças de status

---

## 4. Token

**PRODUCTION_STABILITY_CERTIFIED**
