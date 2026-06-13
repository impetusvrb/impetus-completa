# AIOI — Governance Drift Specification

**Camada:** P4.3 — Governance Drift Detection  
**Serviço:** `backend/src/services/aioi/aioiGovernanceDriftService.js`  

---

## 1. Domínios monitorizados

| Domínio | ID | Verificação |
|---------|-----|-------------|
| Queue Sovereignty | GD-Q01 | Snapshot AIOI, sem F47 rebuild |
| Truth Sovereignty | GD-T01 | truth_state presente, sem soberano alterado |
| Workflow Governance | GD-W01 | open→triaged only |
| Pilot Governance | GD-P01 | MAX 3 tenants, contrato P2 |
| Execution Governance | GD-E01 | HITL obrigatório |
| Learning Governance | GD-L01 | resolved only, sem weight_versions |
| Runtime Invariants | GD-R01 | cognitive_execution_allowed ≠ true |

---

## 2. Regras

- **Observação only** — nenhuma correção automática
- Drift reportado via `drift_detected: true`

---

## 3. Token

**GOVERNANCE_DRIFT_MONITORED**
