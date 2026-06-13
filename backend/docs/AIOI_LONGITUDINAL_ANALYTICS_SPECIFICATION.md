# AIOI — Longitudinal Analytics Specification

**Camada:** P6.3 — Longitudinal Operational Analytics  
**Serviço:** `backend/src/services/aioi/aioiLongitudinalAnalyticsService.js`  

---

## 1. Propósito

Análise longitudinal operacional em janelas 30d, 60d e 90d. **READ ONLY.**

---

## 2. Métricas por janela

| Métrica | Descrição |
|---------|-----------|
| `throughput` | outbox_delivered, ioe_created |
| `latency` | avg_outbox_latency_ms |
| `sla` | breached, at_risk |
| `health` | outbox_failed, outbox_pending |
| `dlq` | count (failed outbox) |
| `compliance` | rate |
| `trend_evolution` | direção agregada |

---

## 3. Token

**LONGITUDINAL_ANALYTICS_CERTIFIED**
