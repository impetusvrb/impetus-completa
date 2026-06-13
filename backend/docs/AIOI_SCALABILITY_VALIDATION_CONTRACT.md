# AIOI — Scalability Validation Contract

**Camada:** P4.2 — Operational Scalability Validation  
**Serviço:** `backend/src/services/aioi/aioiScalabilityValidationService.js`  

---

## 1. Critérios SV-*

| ID | Critério |
|----|----------|
| SV-01 | Throughput scaling — outbox delivered ou standby |
| SV-02 | Worker scaling — worker ativo quando enabled |
| SV-03 | Queue growth tolerance — volume dentro de limites |
| SV-04 | Outbox growth tolerance — error rate contido |
| SV-05 | SLA stability under load — compliance ≥ 70% |
| SV-06 | Health stability — HEALTHY ou STANDBY |
| SV-07 | DLQ containment — utilização ≤ 10% |
| SV-08 | Tenant isolation preserved — pilot tenants only |

---

## 2. Modo

Observação only — nenhuma auto-scaling ou correção.

---

## 3. Token

**SCALABILITY_VALIDATED**
