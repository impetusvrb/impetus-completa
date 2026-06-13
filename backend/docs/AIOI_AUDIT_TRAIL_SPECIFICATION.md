# AIOI — Audit Trail Specification

**Camada:** P5.3 — Audit Trail Consolidation  
**Serviço:** `backend/src/services/aioi/aioiAuditTrailService.js`  

---

## 1. Trilhas consolidadas

| Trilha | Fonte |
|--------|-------|
| `workflow_audit` | Classification consumer + telemetry |
| `execution_audit` | Execution bridge metrics |
| `learning_audit` | Learning bridge metrics |
| `outcome_audit` | Outcome tracking metrics |
| `worker_audit` | Outbox worker stability |
| `health_audit` | Health transitions |
| `tenant_audit` | Pilot flags |
| `decision_audit` | Decision bridge metrics |

---

## 2. Regras

- **READ ONLY** — nenhuma alteração de histórico
- Consolidação em memória + session counters + telemetry ring buffer

---

## 3. Token

**AUDIT_TRAIL_CERTIFIED**
