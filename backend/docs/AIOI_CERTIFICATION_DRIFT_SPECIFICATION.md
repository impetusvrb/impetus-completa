# AIOI — Certification Drift Specification

**Camada:** P6.2 — Certification Drift Monitoring  
**Serviço:** `backend/src/services/aioi/aioiCertificationDriftService.js`  

---

## 1. Propósito

Monitorar integridade das certificações ORG-1..5 e P1..P5. **Observação only — sem correção automática.**

---

## 2. Domínios monitorados

| ID | Documento | Token esperado |
|----|-----------|----------------|
| ORG-1 | `AIOI_ORG_1_QUEUE_CONSOLIDATION_REPORT.md` | `AIOI_ORG_1_QUEUE_SOVEREIGNTY_RESOLUTION_PASS` |
| ORG-2 | `AIOI_ORG_2_TRUTH_STAGE7_CERTIFICATION_REPORT.md` | `AIOI_ORG_2_TRUTH_STAGE7_CERTIFICATION_PASS` |
| ORG-3 | `AIOI_ORG_3_F49_CERTIFICATION_CLOSURE_REPORT.md` | `AIOI_ORG_3_F49_CERTIFICATION_CLOSURE_PASS` |
| ORG-4 | `AIOI_ORG_4_P0_PRODUCTION_PILOT_CERTIFICATION_REPORT.md` | `AIOI_ORG_4_P0_PRODUCTION_PILOT_CERTIFICATION_PASS` |
| ORG-5 | `AIOI_ORG_5_WORKFLOW_SLA_READINESS_REPORT.md` | `AIOI_ORG_5_WORKFLOW_SLA_READINESS_PASS` |
| P1..P5 | Relatórios de certificação respectivos | Tokens P1..P5 |

---

## 3. Token

**CERTIFICATION_DRIFT_MONITORED**
