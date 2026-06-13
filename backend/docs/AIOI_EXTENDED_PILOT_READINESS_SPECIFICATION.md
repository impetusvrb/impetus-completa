# AIOI — Extended Pilot Readiness Specification

**Camada:** P4.6 — Extended Pilot Readiness  
**Serviço:** `backend/src/services/aioi/aioiExtendedPilotReadinessService.js`  

---

## 1. Critérios ER-*

| ID | Critério |
|----|----------|
| ER-01 | Estabilidade — failed_cycles ≤ processing_cycles |
| ER-02 | Governança — zero drift detectado |
| ER-03 | Isolamento — pilot tenants ≤ 3, SV-08 pass |
| ER-04 | Observabilidade — specs + metrics service |
| ER-05 | Compliance SLA — sla_compliance_rate válido |
| ER-06 | Health consistente — status válido |
| ER-07 | Sem regressão ORG-1..5 — docs intactos |
| ER-08 | Sem regressão P1..P3 — docs + testes intactos |

---

## 2. Token

**EXTENDED_PILOT_READY**
