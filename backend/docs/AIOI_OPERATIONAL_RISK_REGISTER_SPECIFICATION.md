# AIOI — Operational Risk Register Specification

**Camada:** P6.5 — Operational Risk Register  
**Serviço:** `backend/src/services/aioi/aioiOperationalRiskRegisterService.js`  

---

## 1. Propósito

Registo consolidado de riscos operacionais enterprise. **READ ONLY.**

---

## 2. Categorias

| Categoria | Descrição |
|-----------|-----------|
| `governance_risk` | Drift de governança e certificação |
| `operational_risk` | Health, ciclos falhados |
| `sla_risk` | Breach e at_risk |
| `capacity_risk` | Saturação e pressão SLA |
| `tenant_risk` | Tenants em risco |
| `compliance_risk` | Score de compliance |
| `risk_trend` | ELEVATING / IMPROVING / STABLE |
| `risk_score` | Score agregado 0–100 |

---

## 3. Token

**RISK_REGISTER_CERTIFIED**
