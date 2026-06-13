# AIOI — SLA Compliance Specification

**Camada:** P3.3 — SLA Compliance Validation  
**Serviço:** `backend/src/services/aioi/aioiSlaComplianceService.js`  

---

## 1. Propósito

Observação de conformidade SLA para IOEs ativos nos pilot tenants — **zero automação**.

Base: `aioiSlaEngineService` (ORG-5) — este serviço apenas **mede**, não altera estados.

---

## 2. Métricas

| Métrica | Descrição |
|---------|-----------|
| `sla_total` | IOEs ativos com SLA aplicável |
| `sla_on_track` | `breach_state` on_track |
| `sla_at_risk` | `breach_state` at_risk |
| `sla_breached` | `breach_state` breached |
| `sla_compliance_rate` | `on_track / total × 100` |
| `priority_distribution` | Contagem por `priority_band` |
| `breach_distribution` | Contagem por `breach_state` |

---

## 3. Funções

| Função | Scope |
|--------|-------|
| `getSlaComplianceSnapshot()` | Agregado pilot tenants |
| `getSlaComplianceForTenant(companyId)` | RLS scoped por tenant |

---

## 4. Proibições

- Escalation automática
- Alteração de `breach_state` ou `due_at`
- Workflow runtime

---

## 5. Token

**SLA_COMPLIANCE_CERTIFIED**
