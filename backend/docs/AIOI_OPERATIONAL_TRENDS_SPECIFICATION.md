# AIOI — Operational Trends Specification

**Camada:** P4.4 — Operational Trend Analytics  
**Serviço:** `backend/src/services/aioi/aioiOperationalTrendService.js`  

---

## 1. Tendências

| Trend | Direção |
|-------|---------|
| `throughput_trend` | UP / DOWN / STABLE |
| `latency_trend` | UP / DOWN / STABLE |
| `sla_trend` | UP / DOWN / STABLE |
| `dlq_trend` | UP / DOWN / STABLE |
| `health_trend` | UP / DOWN / STABLE |
| `tenant_trend` | UP / DOWN / STABLE |

---

## 2. Funções

| Função | Descrição |
|--------|-----------|
| `captureTrendSnapshot()` | Regista ponto de tendência |
| `getOperationalTrends()` | Análise direccional |
| `getTrendSnapshots(limit)` | Histórico ring buffer |

---

## 3. Token

**OPERATIONAL_TRENDS_CERTIFIED**
